# F2 — Auth & Deploy Walkthrough (Micro-Steps)

Every remaining F2 step, broken down click-by-click. Written to be followed
while you're doing it, not read beforehand.

**Prerequisite:** you've cloned the repo and run
`apps/Delayed_Task_Notifier/scripts/setup-f2.ps1` (installs Node/npm/Azure
CLI/GitHub CLI, then `npm install`). If you haven't, do that first — see
[`HANDOFF-TASK-F2.md`](../HANDOFF-TASK-F2.md).

---

## ⚠️ Read this before you start: the order below is deliberate

The handoff doc lists "register the webhook + set 5 secrets" before "register
the App Registration." **Do them in the order below instead.** Three of the five
secrets (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) don't
exist until the App Registration is created, so setting secrets first means
doing it twice.

Correct order: **Deploy → App Registration → Teams webhook → Set secrets →
Verify names → End-to-end test.**

| Step | What it produces | Roughly |
|---|---|---|
| 1. Deploy | `GRAPHQL_ENDPOINT` | 5-10 min |
| 2. App Registration | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | 10 min |
| 3. Teams webhook | `TEAMS_WEBHOOK_URL` | 5 min |
| 4. Set the 5 secrets | Job can run | 5 min |
| 5. Verify query names | Job runs without errors | 10-20 min |
| 6. End-to-end test | Proof it works | 10-15 min |

---

# Step 1 — Deploy

**Goal:** get a live GraphQL endpoint. Nothing else in this doc works until
this succeeds.

### 1.1 — Find your tenant ID

```powershell
az login
az account show --query tenantId -o tsv
```

Copy the GUID it prints. It looks like `72f988bf-86f1-41af-91ab-2d7cd011db47`.
**Write it down** — you'll use it three separate times below.

### 1.2 — Confirm your workspace has a Fabric capacity

Open the Fabric portal → find your workspace → **Workspace settings** →
**License info**. It must show an assigned capacity (Trial, F-SKU, or P-SKU).

> **If there's no capacity assigned, stop here.** `rayfin up` will fail and the
> error won't clearly say why. Assign one, or pick a different workspace, before
> continuing.

Also note the workspace's **exact name** — you'll type it verbatim in 1.4.

### 1.3 — Log in to Rayfin

```powershell
cd apps/Delayed_Task_Notifier
npx rayfin login --tenant <your-tenant-id-from-1.1> --select
```

A browser window opens. Complete the sign-in. The `--select` flag then shows a
workspace picker if you belong to more than one — choose the one from 1.2.

### 1.4 — Deploy

```powershell
npx rayfin up --workspace "<exact-workspace-name-from-1.2>"
```

Keep the quotes — workspace names often contain spaces.

### 1.5 — Copy the GraphQL endpoint

On success, the output includes a URL ending in `/graphql`, like:

```
https://api.fabric.microsoft.com/v1/workspaces/<workspace-id>/graphqlapis/<api-id>/graphql
```

**Copy it now.** This is your `GRAPHQL_ENDPOINT` value for Step 4. If you lose
it, you can find it again in the Fabric portal under the deployed item.

### 1.6 — Confirm the Task table exists

Fabric portal → your workspace → find the deployed data item → confirm you see
a `Task` table with columns `id`, `title`, `assignedAgent`, `dueDate`,
`status`, `lastAlertedAt`.

> **If `rayfin up` returned a 403 "feature not available":** that's the same
> blocker the original author hit — a tenant-level Fabric Admin Portal setting,
> not a code problem. Check **Fabric Admin Portal → Tenant settings** for the
> Fabric Apps / Rayfin preview toggle. Do not keep retrying the same command.

---

# Step 2 — Register the Entra App Registration

**Goal:** create an identity the scheduled job can use to authenticate itself,
forever, with no human logged in.

> **Why this exists:** the job runs every 5 minutes on a GitHub Actions cron.
> There's no browser and no signed-in user, so it can't reuse the interactive
> auth the Jobsite Twin app uses. A manually-pasted token would expire in ~1
> hour and silently break overnight. This service principal lets the job mint a
> fresh token on every single run. See the `AUTH DECISION` comment in
> `scripts/detect-delayed-tasks.mjs`.

### 2.1 — Confirm you're allowed to create one

Azure Portal → **Microsoft Entra ID** → **Overview** → **Properties** → check
**"Users can register applications."**

If that's **No** and you're not Global Admin, you can't complete this step —
you'll need someone who can, or the setting changed. Find that out now, not
after Step 3.

### 2.2 — Create the registration

Azure Portal → **App registrations** → **+ New registration**.

- **Name:** `f2-delayed-task-notifier`
- **Supported account types:** *Accounts in this organizational directory only*
- **Redirect URI:** **leave blank.** That field is for apps humans sign into.
  Nobody signs into this one.
- Click **Register**.

### 2.3 — Copy the two IDs

You land on the Overview page. Copy both:

| Field on the page | Copy it as |
|---|---|
| **Application (client) ID** | `AZURE_CLIENT_ID` |
| **Directory (tenant) ID** | `AZURE_TENANT_ID` (same GUID as 1.1) |

### 2.4 — Create the client secret

Left sidebar → **Certificates & secrets** → **Client secrets** tab →
**+ New client secret**.

- **Description:** `f2-detection-job`
- **Expires:** 12 months (or per your org's policy)
- Click **Add**.

### 2.5 — Copy the secret value IMMEDIATELY

The table now shows two columns: **Value** and **Secret ID**.

> ⚠️ **Copy the `Value` column, not the Secret ID.** Azure displays the Value
> exactly once. Navigate away and it's gone permanently — you'd have to delete
> the secret and start over at 2.4. This is the single most common place people
> lose 10 minutes.

This is your `AZURE_CLIENT_SECRET`.

### 2.6 — Grant it access to the workspace

**Creating the identity does not grant it access to anything.** These are two
separate systems. Skipping this step produces a token that looks completely
valid and still gets rejected — a genuinely confusing failure.

Fabric portal → your workspace → **Manage access** → **+ Add people or groups**
→ search for `f2-delayed-task-notifier` → select it → assign **Contributor** →
**Add**.

> **This is the one step nobody has verified.** Deploy was blocked when this was
> written, so the minimum role the GraphQL API actually needs is unconfirmed.
> Start with Contributor to get it working. Tighten it later if you want — don't
> burn time hunting the minimal role on the first pass.

### 2.7 — Sanity-check that the credentials work

Before wiring anything into GitHub, confirm the identity can get a token:

```powershell
$body = @{
  grant_type    = "client_credentials"
  client_id     = "<AZURE_CLIENT_ID from 2.3>"
  client_secret = "<AZURE_CLIENT_SECRET from 2.5>"
  scope         = "https://graph.fabric.microsoft.com/.default"
}
Invoke-RestMethod -Uri "https://login.microsoftonline.com/<AZURE_TENANT_ID>/oauth2/v2.0/token" -Method Post -Body $body
```

**If you get an `access_token` back:** the credentials are valid. Continue.

**If you get an error here:** the client ID or secret is wrong — most often the
secret got truncated when copied, or the Secret ID was copied instead of the
Value. Redo 2.4-2.5.

> **Important caveat:** a successful token here does **not** prove the GraphQL
> endpoint will accept it. Entra will happily issue tokens for a resource that
> then rejects them. That's what Step 5 tests.

---

# Step 3 — Register the Teams Incoming Webhook

**Goal:** get the URL the job posts Adaptive Cards to. This is UI-only —
there's no supported API to create a channel webhook programmatically.

### 3.1 — Pick the target channel

Decide which Teams channel should receive delayed-task alerts. You need
permission to manage connectors on it.

### 3.2 — Open the connector setup

Hover the channel name → **`•••`** (More options) → **Manage channel** →
**Connectors**.

> **On newer Teams clients** the path may be **`•••` → Workflows** instead.
> Look for "Incoming Webhook" or "Post to a channel when a webhook request is
> received."

### 3.3 — Configure it

Find **Incoming Webhook** in the list → **Configure**.

- **Name:** `Delayed Task Alerts`
- Optionally upload an icon.
- Click **Create**.

### 3.4 — Copy the webhook URL

Teams displays a URL shaped like:

```
https://<tenant-name>.webhook.office.com/webhookb2/<connector-id>@<tenant-id>/IncomingWebhook/<webhook-id>/<guid>
```

Copy the **entire** string. This is your `TEAMS_WEBHOOK_URL`.

> **Treat this like a password.** Anyone holding this URL can post into your
> channel. Never paste it into a commit, a PR description, an issue, or a chat
> message.

### 3.5 — Smoke-test it right now

```powershell
Invoke-RestMethod -Uri "<your-webhook-url>" -Method Post -ContentType "application/json" -Body '{"text":"F2 webhook smoke test"}'
```

A plain-text message should appear in the channel within a few seconds. If it
doesn't, fix that before moving on — it's much easier to debug in isolation than
tangled up with the auth steps.

---

# Step 4 — Set the 5 GitHub Actions repo secrets

**Goal:** hand the job everything it needs. These go in **GitHub Actions repo
secrets**, not a `.env` file — the job runs in CI, not on your laptop.

### 4.1 — Confirm you have all five values

| Secret | Where it came from |
|---|---|
| `GRAPHQL_ENDPOINT` | Step 1.5 |
| `AZURE_TENANT_ID` | Step 1.1 / 2.3 |
| `AZURE_CLIENT_ID` | Step 2.3 |
| `AZURE_CLIENT_SECRET` | Step 2.5 |
| `TEAMS_WEBHOOK_URL` | Step 3.4 |

Missing one? Go back and get it — the job needs all five before it runs at all.

### 4.2 — Set them

Via CLI:

```powershell
gh secret set GRAPHQL_ENDPOINT    --body "<from 1.5>"
gh secret set AZURE_TENANT_ID     --body "<from 1.1>"
gh secret set AZURE_CLIENT_ID     --body "<from 2.3>"
gh secret set AZURE_CLIENT_SECRET --body "<from 2.5>"
gh secret set TEAMS_WEBHOOK_URL   --body "<from 3.4>"
```

Or via UI: repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**, once per value.

### 4.3 — Verify all five registered

```powershell
gh secret list
```

You should see exactly those five names. (Values aren't displayable — that's
expected.)

### 4.4 — Understand what just happened

There's **no switch to flip.** The workflow
(`.github/workflows/f2-detect-delayed-tasks.yml`) self-guards: it checks for all
five secrets on every run and skips quietly with a GitHub `::notice::` if any
are missing. Now that all five exist, the 5-minute cron starts doing real work
on its next tick.

---

# Step 5 — Verify the GraphQL query/mutation names

**Goal:** confirm the job is asking the API for things that actually exist.

The script assumes operations named `tasks` and `updateTask`, matching the field
names declared in `rayfin/data/Task.ts`. **DAB's generated schema is the source
of truth**, and it may have pluralized, cased, or prefixed things differently.

### 5.1 — Run the job locally

```powershell
cd apps/Delayed_Task_Notifier
$env:GRAPHQL_ENDPOINT="<from 1.5>"
$env:AZURE_TENANT_ID="<from 1.1>"
$env:AZURE_CLIENT_ID="<from 2.3>"
$env:AZURE_CLIENT_SECRET="<from 2.5>"
$env:TEAMS_WEBHOOK_URL="<from 3.4>"
node scripts/detect-delayed-tasks.mjs
```

Running it locally first means you see real errors immediately, instead of
waiting 5 minutes per attempt for the cron.

### 5.2 — Read the result

| What you see | What it means | What to do |
|---|---|---|
| `Found 0 delayed task(s) awaiting alert.` and exits clean | ✅ **Everything works.** Auth passed, schema matched, there just aren't any delayed tasks yet. | Go to Step 6. |
| **401 / 403 on the GraphQL call** (but 2.7 returned a token fine) | Identity is valid; the endpoint doesn't accept it. | Recheck **2.6** first — the access grant is the usual culprit. If that's correct, see 5.3 on `GRAPHQL_SCOPE`. |
| **Error at the token step** | Credentials are wrong. | Redo 2.4-2.5. The secret is usually truncated or the Secret ID was copied instead of the Value. |
| **`Cannot query field "tasks"`** or similar | ✅ **Auth fully works** — you're inside. The job is just asking for the wrong name. | Continue to 5.4. |

> That third row is **good news**. It means every auth step succeeded and what's
> left is a small naming fix, not a permissions rabbit hole.

### 5.3 — If you got a 401/403 on the GraphQL call

The script requests a token for `https://graph.fabric.microsoft.com/.default` by
default. That's a best guess from Fabric's general API pattern — never verified
against a live deployment.

The scope tells Entra *which API* the token is for, and Entra stamps that into
the token's audience claim. Wrong scope = a token that looks perfectly valid and
gets rejected anyway.

To override it, set a sixth secret:

```powershell
gh secret set GRAPHQL_SCOPE --body "<the correct scope/resource URI>"
```

The script reads `GRAPHQL_SCOPE` from the environment and falls back to the
default when unset — no code change needed.

### 5.4 — If you got an unknown-field error

Get the real schema, then match the script to it:

- Run `npx rayfin docs`, **or**
- Open the GraphQL item in the Fabric portal and inspect/introspect the schema.

Compare against the four operations in `scripts/detect-delayed-tasks.mjs`:

| Function in the script | Operation it assumes |
|---|---|
| `findUnalertedDelayedTasks()` | query `tasks` with a `filter` argument |
| `findRecoveredTasksNeedingReset()` | query `tasks` with a `filter` argument |
| `markAlerted()` | mutation `updateTask(id:, item:)` |
| `resetAlertedFlag()` | mutation `updateTask(id:, item:)` |

Also confirm field casing (`assignedAgent`, `lastAlertedAt`) and the filter
syntax (`{ status: { eq: "delayed" } }`) match what was generated. Edit the
script to match, then re-run 5.1 until it exits clean.

---

# Step 6 — End-to-end test

**Goal:** prove a delayed task produces exactly one card — and that a task which
recovers and re-delays alerts again.

### 6.1 — Seed a delayed task

In the Fabric portal, add a row to the `Task` table:

| Field | Value |
|---|---|
| `title` | `E2E test task` |
| `assignedAgent` | your name |
| `dueDate` | a date in the past (so "days overdue" is non-zero) |
| `status` | `delayed` |
| `lastAlertedAt` | **leave empty** — this is the dedup gate |

### 6.2 — Trigger the job

Either wait up to 5 minutes for the cron, or trigger it immediately:
repo → **Actions** → **F2 - Detect delayed tasks and alert Teams** →
**Run workflow**.

### 6.3 — Confirm exactly one card arrived

Check the Teams channel. You should see one Adaptive Card showing the task
title, assigned agent, due date, and days overdue.

### 6.4 — Confirm it does NOT re-send

Trigger the workflow a second time. **No new card should appear.**

Verify in the portal that `lastAlertedAt` is now populated — that's what
suppresses the duplicate.

> If you get a second card here, the dedup gate isn't working. Check that
> `markAlerted()` actually wrote `lastAlertedAt` (5.4's mutation names).

### 6.5 — Confirm recovery re-arms the alert

This tests the reset logic, which is easy to forget:

1. Change the task's `status` to `in_progress`.
2. Trigger the workflow. → The job should clear `lastAlertedAt` back to empty.
3. Change `status` back to `delayed`.
4. Trigger the workflow again. → **A second card should now arrive.**

That proves each new delay episode alerts once, rather than a recovered task
going permanently silent.

### 6.6 — Clean up and record it

- Delete the `E2E test task` row.
- Tick off the confirmed items in the
  [issue #2 Definition of Done](https://github.com/ChrisChalmers2/rayfin_hackathon/issues/2).
- If you had to change `GRAPHQL_SCOPE`, the query names, or the workspace role,
  **note the actual working values on the issue** — those are the three things
  nobody could verify in advance, and the next person will need them.

---

## Related docs

- [`HANDOFF-TASK-F2.md`](../HANDOFF-TASK-F2.md) — full F2 handoff. Start there
  if you haven't read it.
- [`F2_HANDOFF_PROMPT.md`](F2_HANDOFF_PROMPT.md) — copy-paste prompt if you'd
  rather drive this from your own Copilot session.
- `apps/Delayed_Task_Notifier/scripts/detect-delayed-tasks.mjs` — the job
  itself; its `AUTH DECISION` header explains why it's built this way.
