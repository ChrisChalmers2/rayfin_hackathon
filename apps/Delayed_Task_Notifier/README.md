
# Delayed Task Notifier (F2)

> **Status:** Scaffold + data entity complete. Deploy is blocked on the current
> session's tenant (Fabric Admin access) — see [HANDOFF-TASK-F2.md](../../HANDOFF-TASK-F2.md)
> at the repo root for the full picture. Any team member with Global Admin on
> their own tenant should be able to pick this up and keep going.

**Delayed Task Notifier** is a small, purpose-built Rayfin app: when a `Task`
flips to `delayed`, it sends a Teams Adaptive Card to a webhook. That's the
entire scope — no escalation, no governance tracking, no summary dashboards.

## Features (target scope)

- **Delayed-task detection** — a scheduled job that finds tasks where
  `status = 'delayed' AND lastAlertedAt IS NULL` (the dedup gate).
- **Teams Adaptive Card alert** — posted to an Incoming Webhook, showing task
  title, assigned agent, due date, and how overdue it is.
- **No duplicate alerts** — `lastAlertedAt` is written atomically with the send,
  so a task is only ever alerted on once per delay.

## Tech stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript, Vite (placeholder status page — this app's real logic is server-side) |
| Data | `@microsoft/rayfin-data` — Rayfin DAB entity (`mssql` dialect) |
| Auth | `@microsoft/rayfin-auth-provider-fabric` |
| Deploy | Rayfin CLI (`rayfin up`) — Fabric-hosted, same as `Jobsite_Twin` |

## Data model

`rayfin/data/Task.ts`:

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | text(256) | Task name |
| `assignedAgent` | text(256) | Who owns the task |
| `dueDate` | date | When it's due |
| `status` | enum: `not_started \| in_progress \| delayed \| complete` | Drives the alert trigger |
| `lastAlertedAt` | date, optional | Dedup anchor — null means "not yet alerted" |

## Getting started

```bash
cd apps/Delayed_Task_Notifier
.\scripts\setup-f2.ps1   # installs Node/npm/Azure CLI/GitHub CLI if missing, then npm install

# Find your tenant ID if you don't know it: az account show --query tenantId -o tsv
az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47      # example GUID — use your own tenant ID
npx rayfin login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47 --select
npx rayfin up --workspace "Rayfin Hackathon"                 # example name — use your own Fabric workspace
```

Then register a Teams Incoming Webhook in your target channel (channel → `...`
→ Connectors → Incoming Webhook → name it, e.g. `Delayed Task Alerts` →
Create) and put the resulting URL in `rayfin/.env` as
`TEAMS_WEBHOOK_URL=https://<tenant-name>.webhook.office.com/webhookb2/...`
(see `rayfin/.env.example` — never commit the real value). The detection job
authenticates to the GraphQL endpoint via an Entra service-principal
client-credentials flow (not a static key or stored token — see the "AUTH
DECISION" comment in `scripts/detect-delayed-tasks.mjs`), so you'll also need
to register an Entra App Registration and set `AZURE_TENANT_ID`,
`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`. Full example formats for all 5
GitHub Actions repo secrets (`GRAPHQL_ENDPOINT`, `AZURE_TENANT_ID`,
`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `TEAMS_WEBHOOK_URL`) are in
`HANDOFF-TASK-F2.md`.

> 📖 **Actually setting this up?** Follow
> [docs/F2_AUTH_WALKTHROUGH.md](../../docs/F2_AUTH_WALKTHROUGH.md) — it breaks
> deploy, App Registration, webhook, secrets, verification, and the end-to-end
> test into numbered micro-steps with troubleshooting tables.

## Where to find things

- Full handoff + status: [HANDOFF-TASK-F2.md](../../HANDOFF-TASK-F2.md) (repo root)
- **Micro-step setup walkthrough: [docs/F2_AUTH_WALKTHROUGH.md](../../docs/F2_AUTH_WALKTHROUGH.md)**
- Step-by-step build prompt: [docs/F2_HANDOFF_PROMPT.md](../../docs/F2_HANDOFF_PROMPT.md) (repo root)
- Entity: `rayfin/data/Task.ts`
- Tracking: [GitHub issue #2](https://github.com/ChrisChalmers2/rayfin_hackathon/issues/2)

## License

Licensed under the MIT license — see the repo root `LICENSE`.
