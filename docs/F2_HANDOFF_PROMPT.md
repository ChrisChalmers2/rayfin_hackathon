# F2 Handoff Prompt — Teams Notification for Delayed Tasks

**How to use this file:** Copy everything below the `---` divider and paste it as your
first message into a fresh Copilot CLI/chat session, pointed at this repo
(`ChrisChalmers2/rayfin_hackathon`, branch `revellbell-microsoft-ubiquitous-funicular`).
Copilot will read the repo, confirm current state, and continue the build from where
it left off.

**Before you paste this prompt:** make sure you actually have a Copilot session/project
open against `ChrisChalmers2/rayfin_hackathon` — pasting this into an unrelated chat
won't have repo access. You'll also need to complete two manual, interactive steps
yourself along the way (browser sign-in, and registering a Teams webhook) — see
sections 3 and 4 below. Everything else can run unattended.

---

I'm picking up feature **F2 — Teams Notification for Delayed Tasks** in the
`rayfin_hackathon` repo. **Scope is intentionally minimal:** when a task flips to
`delayed`, send a Teams Adaptive Card via an incoming webhook. Nothing more — no
response capture, no escalation, no governance tracking, no summary metrics. Please
orient yourself and then continue the build:

## 1. Get oriented
- Read **GitHub issue #2** in `ChrisChalmers2/rayfin_hackathon` — it has the
  current refined scope and a status summary of what's built vs. remaining.
- Check out branch `revellbell-microsoft-ubiquitous-funicular` (already pushed to
  origin) — it contains the scaffold.
- Look at `apps/Delayed_Task_Notifier/` — a Rayfin project (Vite + React + auth/data
  services) already scaffolded, with one entity already defined:
  - `rayfin/data/Task.ts` — `id`, `title`, `assignedAgent`, `dueDate`, `status`
    (`not_started | in_progress | delayed | complete`), and `lastAlertedAt` (the
    dedup anchor — alerts only fire while this is still null).

## 2. Run the environment bootstrap script
```powershell
cd apps/Delayed_Task_Notifier
.\scripts\setup-f2.ps1
```
This checks for Node.js/npm, Azure CLI, and GitHub CLI, auto-installs any that are
missing (via `winget`), and runs `npm install`. This step exists because the original
build session had to install Node.js from scratch before anything else could happen —
running this script first removes that whole category of setup friction. If it installs
something new, **open a fresh terminal** afterward so PATH updates take effect, then
re-run the script to confirm everything reports OK.

## 3. Check whether the Fabric deploy blocker is resolved
The scaffold and entity are done, but **the deploy step is not** — as of 2026-08-06,
`npx rayfin up` returned:
```
403 Forbidden: "The feature is not available"
```
This happened on tenant `c15877fd-f5e5-463e-bc81-8053c8cb7750`
(`MngEnvMCAP000280.onmicrosoft.com`). Root cause: the signed-in account only had
**Global Reader** in Entra (not Global Admin/Fabric Admin), and the tenant's Fabric
Admin Portal "Fabric Apps"/Rayfin preview toggle was not enabled.

**Before continuing, verify your own access is actually unblocked** (this step needs
you — it's an interactive browser sign-in, not something the agent can complete alone):
```powershell
az login --tenant <YOUR-TENANT-ID>
az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv
# Then check https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.directoryRole
# for "Global Administrator" (not just "Global Reader")
```
Then confirm the Fabric Admin Portal at
`https://app.fabric.microsoft.com/admin-portal/tenantSettings` shows the "Fabric Apps"
toggle enabled (or enable it if you have Fabric Admin rights).

If you hit the same 403, **stop and report back** rather than repeating the same
failed deploy attempts — this is a tenant-admin-level blocker, not something fixable
from the CLI.

> **Optional, for full unattended re-runs later:** if you want to remove even this
> browser sign-in step, register an Entra App (service principal) with a client
> secret and Fabric API permissions, then use `az login --service-principal` /
> equivalent non-interactive rayfin auth. Worth doing only if you expect to redeploy
> this repeatedly; not necessary for a one-time run.

## 4. Deploy and register the webhook
```powershell
npx rayfin login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47 --select
npx rayfin up --workspace "Rayfin Hackathon"
```
(Use **your own** tenant ID — find it with `az account show --query tenantId -o tsv` — and your own workspace name; the values above are illustrative examples, not real IDs.)

Then:
- Confirm the `Task` table exists and there's a live GraphQL endpoint in the Fabric
  portal. It'll look something like
  `https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/graphqlapis/<api-id>/graphql`
  — that's your `GRAPHQL_ENDPOINT` value for step 5 below.
- **Register a Teams incoming webhook in your target channel** (channel → `...` →
  Connectors → Incoming Webhook → name it e.g. `Delayed Task Alerts` → Create).
  **This step needs you** — there is no supported API
  to provision a channel webhook programmatically, it's a UI-only action by design.
  The URL you get back looks like
  `https://<tenant-name>.webhook.office.com/webhookb2/<connector-id>@<tenant-id>/IncomingWebhook/<webhook-id>/<guid>`.
  Store the resulting URL in `rayfin/.env` (**never commit it** — `rayfin/.env.example`
  documents the variable name and is the only env file tracked by git; `.gitignore`
  blocks the rest).
- Smoke-test a plain POST to the webhook, e.g.:
  ```powershell
  Invoke-RestMethod -Uri "<your-webhook-url>" -Method Post -ContentType "application/json" -Body '{"text":"F2 webhook smoke test"}'
  ```
  You should see a plain-text message land in the Teams channel within a few seconds.

## 5. Wire up the detection job (already scaffolded)
The detection job is **already scaffolded** — you don't need to decide where it
runs, that decision is made: `.github/workflows/f2-detect-delayed-tasks.yml`
runs `apps/Delayed_Task_Notifier/scripts/detect-delayed-tasks.mjs` on a 5-minute
cron via GitHub Actions (Rayfin itself has no functions/cron service — only
auth, data/GraphQL, and static hosting — so GitHub Actions is the scheduler).

What's left for you:
1. **Register an Entra App Registration (service principal)**, e.g. via Azure Portal
   → **App registrations** → **New registration**, or `az ad sp create-for-rbac
   --name f2-delayed-task-notifier`. Grant it whatever role the deployed Fabric
   data API needs for read/write on `Task` (confirm the exact role once
   deployed). Create a client secret under **Certificates & secrets** — copy it
   immediately, Azure only shows it once.
2. Add 5 repo secrets (Settings → Secrets and variables → Actions, or `gh secret set <name> --body "<value>"`):

   | Secret | Example format |
   | --- | --- |
   | `GRAPHQL_ENDPOINT` | `https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/graphqlapis/<api-id>/graphql` |
   | `AZURE_TENANT_ID` | `72f988bf-86f1-41af-91ab-2d7cd011db47` (example — use `az account show --query tenantId -o tsv`) |
   | `AZURE_CLIENT_ID` | The App Registration's "Application (client) ID" from step 1 |
   | `AZURE_CLIENT_SECRET` | The client secret from step 1 |
   | `TEAMS_WEBHOOK_URL` | `https://contoso.webhook.office.com/webhookb2/.../IncomingWebhook/.../...` |

   Once all 5 exist, the cron workflow starts running automatically — it
   self-guards and silently skips (via a `::notice::`, not a failure) until
   all 5 secrets are present, so there's no separate "enable" step.
3. **Confirm the `GRAPHQL_SCOPE`** (optional env var, defaults to
   `https://graph.fabric.microsoft.com/.default`): the auth *mechanism* is
   already decided (Entra service-principal client-credentials — see the
   "AUTH DECISION" comment in `detect-delayed-tasks.mjs` for the rationale:
   Fabric/DAB endpoints are Entra-secured, and a stored static token would go
   stale between 5-minute runs). What's left is just confirming the exact
   scope/resource string the deployed data API expects, once you can
   introspect the live GraphQL schema/auth config (`rayfin docs`, or the
   Fabric portal). Set `GRAPHQL_SCOPE` as a repo secret too if it differs
   from the default.
4. Verify the query/mutation names in `detect-delayed-tasks.mjs` (`tasks`,
   `updateTask`) match what DAB actually generated — they're written to
   match `Task.ts`'s field names, but the generated schema is the source of
   truth.
5. Test locally first: `cd apps/Delayed_Task_Notifier && npm run detect:delayed`
   (with the env vars set locally) before relying on the scheduled workflow.
6. Seed one test task with `status = delayed` and `lastAlertedAt = null`; run
   the job twice (`workflow_dispatch` or locally) and confirm the alert fires
   exactly once — `lastAlertedAt` should stop it from re-firing.

## 6. Adaptive Card (already built into the detection job)
The card payload is already implemented in `buildAdaptiveCard()` inside
`detect-delayed-tasks.mjs` — task title, assigned agent, due date, and days
overdue. Nothing to build here unless you want to improve the visual design;
just confirm it renders correctly in Teams once step 5 is wired up.

## 7. End-to-end test + demo
Seed a few test tasks, flip one to `delayed`, trigger the workflow manually
(`workflow_dispatch` in the Actions tab, or `npm run detect:delayed` locally),
and confirm exactly one card arrives in the target Teams channel with correct
details. Rehearse a short demo: task flips to delayed → card appears in Teams.

## 8. Keep tracking in sync
As you complete each step, update GitHub issue #2 (comment or edit) so progress is
visible to the team, and commit to the `revellbell-microsoft-ubiquitous-funicular`
branch (or open a new branch/PR off it if you'd rather keep changes reviewable — ask
before merging to `main`).

## 9. If you get stuck on the Fabric blocker
Do not keep retrying `rayfin up` against the same tenant/workspace expecting a
different result — that's a known dead end. Instead:
- Check MDX support ticket **#11119154** (new-tenant provisioning request, filed
  2026-08-06) for status.
- If you have your own working Fabric tenant with Global Admin + Fabric Admin rights,
  prefer deploying there instead of waiting.

---

## What's automated vs. what needs you (summary)

Assumes your Fabric tenant access is already unblocked. If it 403s the same way ours
did, add unknown time back for tenant troubleshooting.

| Step | Time | Automated? | What To Do |
|---|---|---|---|
| 1. Orient (read issue #2, checkout branch) | ~5 min | ✅ | Nothing — the agent reads the issue and checks out the branch for you. |
| 2. Run `setup-f2.ps1` | ~5-10 min | ✅ | Nothing — the agent runs the script, which installs missing tools and runs `npm install`. |
| 3. `az login` / `rayfin login` | ~2-5 min | ❌ manual | Run the two login commands yourself and complete the browser sign-in prompt. |
| 4. `rayfin up` deploy | ~5-10 min | ✅ | Nothing — the agent runs the deploy, but only succeeds if your tenant access already works. |
| 5. Register Teams webhook + Entra service principal + set 5 repo secrets | ~15 min | ❌ manual | Create the Teams webhook, register an Entra App Registration for the detection job's auth, then add `GRAPHQL_ENDPOINT`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `TEAMS_WEBHOOK_URL` as GitHub Actions repo secrets (not `.env` — the detection job runs in CI). |
| 6. Confirm `GRAPHQL_SCOPE` | ~5-10 min | ✅ mostly decided | The auth *mechanism* is already decided (Entra client-credentials, not a static key or stored token — see the script's "AUTH DECISION" comment). Just confirm the exact scope string against the live data API once deployed. |
| 7. Detection job + Adaptive Card | 0 min | ✅ already built | Nothing — `.github/workflows/f2-detect-delayed-tasks.yml` and `detect-delayed-tasks.mjs` already implement the query, dedup, and card. Just verify the GraphQL query/mutation names match what was actually generated. |
| 8. E2E test + demo rehearsal | ~30 min | ✅ | Optional: sit in on the demo rehearsal to confirm the card looks right in your channel. |
| 9. Tracking sync | ~10 min | ✅ | Nothing — the agent updates issue #2 and commits progress. |

**Total: ~1.5-2.5 hours** — down further now that the detection job and card are
pre-built. Of that, ~30-45 minutes (steps 3, 5) requires you to personally do
something — mostly registering the Teams webhook and the Entra App Registration,
since the auth-token *mechanism* decision itself is already made.
