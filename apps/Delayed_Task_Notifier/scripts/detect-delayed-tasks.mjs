//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * F2 detection job: finds Tasks that have flipped to "delayed" and haven't
 * been alerted on yet, posts a Teams Adaptive Card for each, then marks
 * them alerted so the next run doesn't re-send.
 *
 * Runs on a schedule via .github/workflows/f2-detect-delayed-tasks.yml
 * (no Rayfin-hosted compute exists for this - Rayfin only provides auth,
 * data (DAB/GraphQL), and static hosting; there is no functions/cron
 * service to host this job inside the app itself).
 *
 * Required environment variables (see rayfin/.env.example):
 *   GRAPHQL_ENDPOINT    - the deployed Rayfin data API GraphQL URL
 *   AZURE_TENANT_ID     - Entra tenant ID for the service principal below
 *   AZURE_CLIENT_ID     - Entra App Registration (service principal) client ID
 *   AZURE_CLIENT_SECRET - service principal client secret
 *   GRAPHQL_SCOPE       - OAuth scope/resource to request a token for
 *                         (defaults to "https://graph.fabric.microsoft.com/.default"
 *                         if unset - override once the real scope is confirmed
 *                         against the deployed data API)
 *   TEAMS_WEBHOOK_URL   - Teams incoming webhook URL
 *
 * AUTH DECISION (resolved 2026-08-06, see HANDOFF-TASK-F2.md "Resolve the
 * auth-token open question"): use an Entra service-principal client-credentials
 * flow, not a static API key or a manually-obtained bearer token. Rationale:
 *   - Fabric/DAB GraphQL endpoints are Entra-secured by default; there's no
 *     first-class static-API-key auth path to rely on here.
 *   - A stored bearer token expires (~1hr) and this job runs every 5 min for
 *     potentially weeks between deploys, so a stored token would silently go
 *     stale. A service principal lets the job mint a fresh token every run.
 *   - Optional upgrade once this is deployed and stable: replace the client
 *     secret with a GitHub Actions OIDC federated credential on the same App
 *     Registration, so no secret needs to be stored/rotated at all. Not done
 *     yet because it requires a one-time trust config on the Entra app that
 *     couldn't be verified while deploy was blocked.
 *
 * STILL OPEN (untested - deploy has been blocked, see HANDOFF-TASK-F2.md):
 * confirm the query/mutation names and field casing below match what DAB
 * actually generated (they're written to match Task.ts's declared field
 * names, but the generated schema is the source of truth), and confirm the
 * exact `GRAPHQL_SCOPE` value the deployed data API expects.
 */

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const GRAPHQL_SCOPE = process.env.GRAPHQL_SCOPE || "https://graph.fabric.microsoft.com/.default";
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;

function requireEnv(name, value) {
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
}

requireEnv("GRAPHQL_ENDPOINT", GRAPHQL_ENDPOINT);
requireEnv("AZURE_TENANT_ID", AZURE_TENANT_ID);
requireEnv("AZURE_CLIENT_ID", AZURE_CLIENT_ID);
requireEnv("AZURE_CLIENT_SECRET", AZURE_CLIENT_SECRET);
requireEnv("TEAMS_WEBHOOK_URL", TEAMS_WEBHOOK_URL);

// Cached for the lifetime of this process (one detection run) - no need to
// refresh mid-run, a fresh token is minted at the start of every scheduled run.
let cachedAccessToken = null;

/**
 * Acquires a bearer token via the Entra client-credentials grant. Uses a
 * raw fetch rather than pulling in @azure/identity, to keep this script's
 * footprint minimal (matches the rest of the script's plain-fetch style).
 */
async function getAccessToken() {
    if (cachedAccessToken) {
        return cachedAccessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: GRAPHQL_SCOPE,
    });

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
        throw new Error(
            `Failed to acquire Entra access token: ${res.status} ${JSON.stringify(data)}`
        );
    }

    cachedAccessToken = data.access_token;
    return cachedAccessToken;
}

async function graphql(query, variables) {
    const token = await getAccessToken();
    const res = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    if (!res.ok || body.errors) {
        throw new Error(
            `GraphQL request failed: ${res.status} ${JSON.stringify(body.errors ?? body)}`
        );
    }
    return body.data;
}

/** Finds tasks that are delayed and haven't been alerted on yet. */
async function findUnalertedDelayedTasks() {
    const query = `
        query DelayedTasks {
            tasks(filter: { status: { eq: "delayed" }, lastAlertedAt: { isNull: true } }) {
                items {
                    id
                    title
                    assignedAgent
                    dueDate
                    status
                    lastAlertedAt
                }
            }
        }
    `;
    const data = await graphql(query);
    return data.tasks.items;
}

/**
 * Finds tasks that have recovered from "delayed" (any other status) but
 * still carry a `lastAlertedAt` from a prior delay episode. Without this,
 * a task that goes delayed -> in_progress -> delayed again would never
 * re-alert, since `lastAlertedAt` would still be non-null from the first
 * episode. Resetting it here means each new delay episode alerts exactly
 * once, same as the first.
 */
async function findRecoveredTasksNeedingReset() {
    const query = `
        query RecoveredTasks {
            tasks(filter: { status: { neq: "delayed" }, lastAlertedAt: { isNull: false } }) {
                items {
                    id
                }
            }
        }
    `;
    const data = await graphql(query);
    return data.tasks.items;
}

/** Clears `lastAlertedAt` so a future delay episode can alert again. */
async function resetAlertedFlag(taskId) {
    const mutation = `
        mutation ResetTaskAlerted($id: ID!) {
            updateTask(id: $id, item: { lastAlertedAt: null }) {
                id
                lastAlertedAt
            }
        }
    `;
    await graphql(mutation, { id: taskId });
}

/**
 * Marks a task as alerted. Called immediately after a successful webhook
 * send (never before) so a failed send doesn't silently mark it done, and
 * as close to atomic-with-the-send as this two-step API allows so a
 * successful send never risks a duplicate re-alert on the next run.
 */
async function markAlerted(taskId, alertedAt) {
    const mutation = `
        mutation MarkTaskAlerted($id: ID!, $lastAlertedAt: Date!) {
            updateTask(id: $id, item: { lastAlertedAt: $lastAlertedAt }) {
                id
                lastAlertedAt
            }
        }
    `;
    await graphql(mutation, { id: taskId, lastAlertedAt: alertedAt });
}

/** Builds the Teams Adaptive Card payload for one delayed task. */
function buildAdaptiveCard(task) {
    const dueDate = new Date(task.dueDate);
    const daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "TextBlock",
                            text: "⏰ Task delayed",
                            weight: "Bolder",
                            size: "Medium",
                            color: "Attention",
                        },
                        {
                            type: "FactSet",
                            facts: [
                                { title: "Task", value: task.title },
                                { title: "Assigned to", value: task.assignedAgent },
                                { title: "Due date", value: dueDate.toDateString() },
                                {
                                    title: "Overdue by",
                                    value:
                                        daysOverdue === 0
                                            ? "due today or unclear"
                                            : `${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    };
}

async function sendTeamsAlert(task) {
    const card = buildAdaptiveCard(task);
    const res = await fetch(TEAMS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
    });
    if (!res.ok) {
        throw new Error(`Teams webhook POST failed: ${res.status} ${await res.text()}`);
    }
}

async function main() {
    const recovered = await findRecoveredTasksNeedingReset();
    for (const task of recovered) {
        try {
            await resetAlertedFlag(task.id);
            console.log(`Reset alert flag for recovered task ${task.id}.`);
        } catch (err) {
            console.error(`Failed to reset alert flag for task ${task.id}:`, err.message);
        }
    }

    const tasks = await findUnalertedDelayedTasks();
    console.log(`Found ${tasks.length} delayed task(s) awaiting alert.`);

    for (const task of tasks) {
        try {
            await sendTeamsAlert(task);
            await markAlerted(task.id, new Date().toISOString());
            console.log(`Alerted and marked task ${task.id} ("${task.title}").`);
        } catch (err) {
            // Don't let one bad task stop the rest of the batch, and don't
            // mark it alerted if the send failed - it'll be retried next run.
            console.error(`Failed to alert task ${task.id}:`, err.message);
        }
    }
}

main().catch((err) => {
    console.error("Detection job failed:", err);
    process.exit(1);
});
