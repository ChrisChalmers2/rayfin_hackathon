# F2 — Teams Notification for Delayed Tasks — Handoff

Hey! This is the "here's what I did and here's where you pick up" note for the delayed-task Teams notifier. If you're reading this cold, you should be able to get productive in about 30 minutes. Ping me if anything here is stale.

> **Who should pick this up:** everyone on this hackathon team has Global Admin on
> their own tenant **except me** — so if you're reading this, the tenant blocker
> below almost certainly doesn't apply to you. You should be able to run
> `rayfin up` successfully where I couldn't.

## TL;DR

- **Scaffold shipped:** a net-new Rayfin app, `apps/Delayed_Task_Notifier/`, with a `Task` entity defined and the frontend/build scaffold in place.
- **Blocked for me, not broken:** `npx rayfin up` currently 403s ("The feature is not available") on **my** tenant — confirmed to be a tenant-wide Fabric Admin setting (I only have Global Reader), not an app or code problem. A new-tenant request (MDX ticket #11119154) is in flight to resolve it on my end, but since you have Global Admin already, you shouldn't need to wait on that — just deploy from your own working tenant/workspace.
- **Left to do:** deploy + register the Teams webhook, build the delayed-task detection job, build the Adaptive Card, and run an end-to-end test. See `docs/F2_HANDOFF_PROMPT.md` for the full step-by-step build prompt (paste that into your own Copilot session to continue the build).

## 🔒 Before making this public

Same rules as the rest of this repo — see **[SECURITY.md](SECURITY.md)** at the repo root for the full checklist. For this app specifically:

- **`apps/Delayed_Task_Notifier/rayfin/rayfin.yml`** — will carry `allowedRedirectUris` once deployed; template it out or read from env before publishing, same as `Jobsite_Twin`.
- **`apps/Delayed_Task_Notifier/rayfin/.env.example`** documents `TEAMS_WEBHOOK_URL` as a name only — never commit the real webhook URL.

Secrets (the Rayfin publishable key, tenant/workspace IDs in `rayfin/.deployments.json`, and all `.env*` files) are already gitignored under `apps/Delayed_Task_Notifier/` and must stay that way.

## What's working (scaffold complete)

Shipped so far:

- ✅ Net-new Rayfin project scaffolded via `npm create @microsoft/rayfin@latest` (auth + data services, Fabric auth method, static hosting).
- ✅ `Task` entity defined with the exact fields F2 needs — nothing more.
- ✅ Minimal Vite + React + TS frontend scaffold (placeholder status page — F2's real logic is server-side, not UI).
- ✅ `npm install` succeeds locally (791 packages).
- ✅ Bootstrap script (`apps/Delayed_Task_Notifier/scripts/setup-f2.ps1`) — auto-installs Node.js/npm, Azure CLI, and GitHub CLI via `winget` if missing, then runs `npm install`. Removes the exact setup friction hit when this app was first scaffolded.
- ✅ Detection job + Adaptive Card **already built**: `apps/Delayed_Task_Notifier/scripts/detect-delayed-tasks.mjs` queries `Task` for delayed, unalerted rows, posts a Teams Adaptive Card (title, assigned agent, due date, days overdue) per row, and marks it alerted — plus a **reset pass** that clears `lastAlertedAt` on any task that's recovered from `delayed` to another status, so a task that gets delayed again later re-alerts instead of staying silent forever. Runs via `.github/workflows/f2-detect-delayed-tasks.yml`, a 5-minute cron GitHub Actions workflow (Rayfin has no functions/cron service of its own — only auth, data/GraphQL, and static hosting — so GitHub Actions is the scheduler).
- ❌ **Not yet working:** `rayfin up` deploy — blocked on tenant access (see below).

The `Task` entity (`apps/Delayed_Task_Notifier/rayfin/data/Task.ts`):

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `title` | text(256) | Task name |
| `assignedAgent` | text(256) | Who owns the task |
| `dueDate` | date | When it's due |
| `status` | enum: `not_started \| in_progress \| delayed \| complete` | Drives the alert trigger |
| `lastAlertedAt` | date, optional | **Dedup anchor** — the detection job only alerts while this is still null, and must write it atomically with the send (never after) so a send failure can't cause a duplicate alert. |

Row-level policy: `@authenticated(["read", "create", "update", "delete"])` — any signed-in user can read/write; no per-user ownership check needed for this entity (unlike `Comment` in Task 7.7).

Files created this phase (all paths relative to repo root):

- `apps/Delayed_Task_Notifier/rayfin/data/Task.ts` — the entity.
- `apps/Delayed_Task_Notifier/rayfin/data/schema.ts` — binding-only file that registers `Task` with the client.
- `apps/Delayed_Task_Notifier/rayfin/.env.example` — documents `TEAMS_WEBHOOK_URL`, `GRAPHQL_ENDPOINT`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `GRAPHQL_SCOPE`.
- `apps/Delayed_Task_Notifier/scripts/setup-f2.ps1` — environment bootstrap script.
- `apps/Delayed_Task_Notifier/scripts/detect-delayed-tasks.mjs` — the detection job + Adaptive Card builder.
- `.github/workflows/f2-detect-delayed-tasks.yml` — 5-minute cron workflow that runs the detection job.
- `apps/Delayed_Task_Notifier/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx` — minimal frontend scaffold, trimmed from `Jobsite_Twin`'s conventions.
- `docs/F2_HANDOFF_PROMPT.md` — full copy-paste build prompt for continuing the work in a fresh Copilot session, with a time-estimate + "what to do" table.

## What's left

- **Deploy** — run `rayfin up` (needs your Global Admin access).
- **Register the Teams webhook + set 5 repo secrets** — create an Incoming Webhook connector in the target Teams channel (UI-only, no API for this), then add `GRAPHQL_ENDPOINT`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `TEAMS_WEBHOOK_URL` as GitHub Actions repo secrets.
- **Register an Entra App Registration (service principal)** with access to the deployed Fabric workspace/item, and grant it whatever role the data API needs for read/write on `Task`. This resolves the auth-token question below (decision made — see script comment header) but still needs the actual App Registration created once someone has deploy access.
- **Verify query/mutation names** — `detect-delayed-tasks.mjs` assumes `tasks`/`updateTask` GraphQL operations matching `Task.ts`'s field names; confirm against what DAB actually generated.
- **End-to-end test** — seed test tasks, flip one to `delayed`, confirm exactly one card arrives in Teams.

The detection job and Adaptive Card themselves are **already built** — see "What's working" above. Full step-by-step instructions are in `docs/F2_HANDOFF_PROMPT.md`, and every step above is broken into numbered micro-steps in **[`docs/F2_AUTH_WALKTHROUGH.md`](docs/F2_AUTH_WALKTHROUGH.md)** — follow that one if you're actually executing rather than reviewing.

## Known gotchas

- **The Fabric 403 I hit is tenant-wide, not app-specific.** Reproduced identically on this brand-new app as on `Jobsite_Twin` — confirms it's my tenant's Fabric Admin Portal setting (I only have Global Reader), not a code or config problem. Since you have Global Admin, you shouldn't hit this — but if you somehow do, it's a tenant setting to check, not a bug in this app.
- **Rayfin has no functions/cron/compute service** — only auth, data (GraphQL/DAB), and static hosting (confirmed via `rayfin --help`: just `init`, `up`, `env`, `login`, `logout`, `docs`). The detection job can't live inside the Rayfin app itself, which is why it's a separate GitHub Actions scheduled workflow instead.
- **Auth mechanism decided, one setup step remains.** `detect-delayed-tasks.mjs` mints its own GraphQL bearer token every run via an Entra service-principal client-credentials flow (not a static key, and not a stored token — those would go stale between 5-minute runs). What's left: register the actual App Registration once someone has deploy access, grant it access to the Fabric workspace/item, and confirm the exact `GRAPHQL_SCOPE` value against the live data API. See the script's comment header for the full rationale.
- **`.gitignore`'s blanket `rayfin/.env*` rule also hides `.env.example`.** Needed an explicit `!rayfin/.env.example` negation line so the committed template stays tracked while real `.env` files stay ignored.
- **Don't commit secrets.** `rayfin/.env*`, `rayfin/.deployments.json`, and the Teams webhook URL must never be committed — and the detection job's secrets belong in GitHub Actions repo secrets, not `.env` (the job runs in CI, not locally). See `apps/Delayed_Task_Notifier/.gitignore`.

## How to get running locally

1. Clone the repo, check out branch `revellbell-microsoft-ubiquitous-funicular`.
2. `cd apps/Delayed_Task_Notifier`.
3. Run `.\scripts\setup-f2.ps1` — installs Node.js/npm/Azure CLI/GitHub CLI if missing, then runs `npm install`. (Open a new terminal afterward if it installed anything, so PATH updates apply.)
4. Find your tenant ID first if you don't already know it: `az account show --query tenantId -o tsv` (after a plain `az login`). It looks like a GUID, e.g. `72f988bf-86f1-41af-91ab-2d7cd011db47`. Then run:
   - `az login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47` (use **your own** tenant ID, not this example)
   - `npx rayfin login --tenant 72f988bf-86f1-41af-91ab-2d7cd011db47 --select` (interactive browser sign-in — can't be scripted around this without setting up a service principal first). `--select` pops a workspace picker if you belong to more than one Fabric workspace.
5. `npx rayfin up --workspace "Rayfin Hackathon"` — replace `"Rayfin Hackathon"` with whatever you named your Fabric workspace (any workspace you have Contributor+ access to and that has a Fabric capacity assigned; check **Fabric Admin Portal → Workspaces** if you're not sure of the exact name).
6. **Expected:** the `Task` entity deploys and you get a live GraphQL endpoint (something like `https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/.../graphql`) plus a static hosting deploy — this should just work given your Global Admin access. **If you unexpectedly get a 403 "feature not available"**, that's the same tenant blocker I hit; check your Fabric Admin Portal settings before assuming it's a code problem.
7. After deploy succeeds, copy the printed GraphQL endpoint URL — you'll need it for the `GRAPHQL_ENDPOINT` secret below.

## Registering the Teams webhook + setting repo secrets (with examples)

1. **In Teams:** open the target channel → `•••` (more options) → **Manage channel** → **Connectors** (or **Workflows** on newer Teams — look for "Incoming Webhook"). Click **Configure**, name it something like `Delayed Task Alerts`, optionally upload an icon, click **Create**.
2. Teams shows you a webhook URL that looks like:
   ```
   https://<tenant-name>.webhook.office.com/webhookb2/<connector-id>@<tenant-id>/IncomingWebhook/<webhook-id>/<another-guid>
   ```
   Copy the **entire** URL — this is a secret, treat it like a password. Never paste it into a commit, PR description, or Slack/Teams message that isn't a secrets manager.
3. **Register an Entra App Registration (service principal)** — Azure Portal (or `az ad app create` / `az ad sp create-for-rbac`) → **App registrations** → **New registration** → name it e.g. `f2-delayed-task-notifier` → create a client secret under **Certificates & secrets**. Grant it whatever role/permission the deployed Fabric data API requires for read/write on `Task` (confirm the exact role once deployed — see "Known gotchas"). This is what the detection job uses to mint its own short-lived GraphQL token every run, instead of storing a token that would go stale between 5-minute runs.

   > 📖 **Doing this for the first time?** [`docs/F2_AUTH_WALKTHROUGH.md`](docs/F2_AUTH_WALKTHROUGH.md) breaks every remaining F2 step — deploy, App Registration, webhook, secrets, verification, and the end-to-end test — into numbered micro-steps, with a troubleshooting table for reading auth errors. Follow that alongside this doc.

4. **Set the 5 GitHub Actions repo secrets** (repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**):

   | Secret name | Example format | Where it comes from |
   | --- | --- | --- |
   | `TEAMS_WEBHOOK_URL` | `https://contoso.webhook.office.com/webhookb2/abc123.../IncomingWebhook/def456.../ghi789...` | Step 2 above |
   | `GRAPHQL_ENDPOINT` | `https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/graphqlapis/<api-id>/graphql` | Printed at the end of a successful `npx rayfin up` |
   | `AZURE_TENANT_ID` | `72f988bf-86f1-41af-91ab-2d7cd011db47` (example GUID) | `az account show --query tenantId -o tsv` |
   | `AZURE_CLIENT_ID` | GUID, e.g. `11111111-2222-3333-4444-555555555555` | The App Registration from step 3 (its "Application (client) ID") |
   | `AZURE_CLIENT_SECRET` | Opaque secret string | The client secret you created in step 3 — copy it immediately, Azure only shows it once |

   You can also set these with the GitHub CLI instead of the UI, e.g.:
   ```powershell
   gh secret set TEAMS_WEBHOOK_URL --body "https://contoso.webhook.office.com/webhookb2/....."
   gh secret set GRAPHQL_ENDPOINT --body "https://api.fabric.microsoft.com/v1/workspaces/....../graphql"
   gh secret set AZURE_TENANT_ID --body "<your-tenant-id>"
   gh secret set AZURE_CLIENT_ID --body "<your-app-registration-client-id>"
   gh secret set AZURE_CLIENT_SECRET --body "<your-client-secret>"
   ```
5. Once all 5 secrets exist, `.github/workflows/f2-detect-delayed-tasks.yml` automatically starts running every 5 minutes — no other toggle needed (it self-guards and skips quietly with a `::notice::` until all 5 are set).
6. **Smoke test:** in the deployed `Task` table, add a row with `status: delayed` and `lastAlertedAt` empty. Within 5 minutes you should see one Adaptive Card in the Teams channel. Flip it back to `in_progress` and then to `delayed` again — confirm you get a *second* card (proves the reset-on-recovery logic works, not just first-alert).

## Where to find things

- Full build prompt (paste into a fresh Copilot session to continue): `docs/F2_HANDOFF_PROMPT.md`
- **Auth setup walkthrough (every remaining step broken into numbered micro-steps, with troubleshooting tables): `docs/F2_AUTH_WALKTHROUGH.md`**
- Entity: `apps/Delayed_Task_Notifier/rayfin/data/Task.ts`
- Binding: `apps/Delayed_Task_Notifier/rayfin/data/schema.ts`
- Rayfin config: `apps/Delayed_Task_Notifier/rayfin/rayfin.yml`
- Bootstrap script: `apps/Delayed_Task_Notifier/scripts/setup-f2.ps1`
- Detection job: `apps/Delayed_Task_Notifier/scripts/detect-delayed-tasks.mjs`
- Scheduled workflow: `.github/workflows/f2-detect-delayed-tasks.yml`
- Env template: `apps/Delayed_Task_Notifier/rayfin/.env.example`
- Tracking: GitHub issue #2 in this repo (refined narrow scope — Teams notification only, no escalation/governance features).
- Tenant blocker tracking: MDX support ticket #11119154 (new-tenant provisioning request, references prior closed ticket #11119004).

## Related backlog

- **Task 7.7 (Comments with Entra ID)** — separate feature, separate app (`Jobsite_Twin`), see `HANDOFF-TASK-7.7.md`. No dependency between the two.
- If the tenant blocker resolves via a **new** MDX tenant rather than a fix to this one, re-verify `az login` / `rayfin login` / `rayfin up` against the new tenant before resuming — don't assume the same credentials/workspace ID carry over.

---

Thanks for picking this up. The scaffold and entity are done — the only thing I couldn't finish was deploy, and that's purely down to my own tenant access, not the app. You have Global Admin, so you should be able to just run `rayfin up` and keep going from step 5 in "How to get running locally" above.
