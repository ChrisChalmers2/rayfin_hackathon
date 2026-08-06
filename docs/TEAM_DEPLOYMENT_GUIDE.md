# Jobsite Twin — Team Deployment Guide

**Purpose:** Deploy the `rayfin_hackathon` repo's Jobsite Twin app into your own Fabric demo tenant/workspace for testing.

**Repo:** `https://github.com/ChrisChalmers2/rayfin_hackathon` (branch: `main`)

This guide reflects lessons learned from an actual end-to-end deployment on 2026-07-28 — including gotchas
the original setup docs didn't cover. Follow it in order; don't skip the "watch for" notes.

---

## Prerequisites

- Microsoft Fabric enabled in your tenant, with a trial or paid capacity
- A Fabric workspace you have Admin/Contributor access to (empty is fine, or use an existing one)
- Node.js 22+ (v24 also confirmed working), npm, Git
- Azure CLI (`az`) installed
- GitHub access to `ChrisChalmers2/rayfin_hackathon` (ask for repo access if you don't have it)

---

## Step 1 — Sign in

```bash
az login --tenant <YOUR-TENANT-ID>
az account show   # confirm tenantId matches your target tenant
```

If you use multiple GitHub accounts, make sure the right one is active:

```bash
gh auth status
gh auth switch --user <your-github-account>   # if needed
```

---

## Step 2 — Clone and check out `main`

```bash
git clone https://github.com/ChrisChalmers2/rayfin_hackathon.git
cd rayfin_hackathon
git checkout main
git pull origin main
```

---

## Step 3 — Confirm/create your Fabric workspace

Either use an existing empty workspace or create a new one in the Fabric portal. Note its **workspace ID**
(the GUID after `/groups/` in the portal URL) — you'll need it in Step 6.

---

## Step 4 — Create the Lakehouse

**⚠️ Critical — enable schemas at creation time.** If you create the Lakehouse without this, the notebook's
`saveAsTable("dbo.projects")` calls will fail with cryptic Spark errors, and there's no fix short of deleting
and recreating the Lakehouse.

- **Via Fabric portal:** New Item → Lakehouse → name it `The_Jobsite_LH` → **make sure "Lakehouse schemas" is
  enabled** before creating it.
- **Via REST API** (if scripting this): include `"creationPayload": {"enableSchemas": true}` in the create
  request body.

---

## Step 5 — Import and run the synthetic data notebook

1. In your workspace: **New Item → Import → Notebook**, select `notebooks/01_synthetic_data_construction.ipynb`.
2. Attach `The_Jobsite_LH` as the notebook's **default Lakehouse**.
3. **Run all.**
4. First run takes a few minutes. It writes 4 Delta tables under the `dbo` schema:

| Table | Expected rows |
|---|---:|
| `projects` | 20 |
| `tasks` | ~347 |
| `costs` | ~1,041 (3× tasks) |
| `locations` | 116 |

5. The notebook's own validation cells (Section 9) will assert these counts and other invariants — don't
   proceed if any assertion fails.

**Optional but recommended:** run `validation/01_validate_lakehouse.sql` against the Lakehouse's SQL analytics
endpoint to independently confirm the row counts and referential integrity.

---

## Step 6 — Create the `Jobsite_SM` semantic model

Build a Direct Lake semantic model over the four Lakehouse tables. You can do this via the Fabric portal's
"New semantic model" flow from the Lakehouse's SQL endpoint, or script it via TMDL/REST API.

### Relationships (all four, exact cardinality matters)

| One side | Many side | Active? |
|---|---|---|
| `projects[project_id]` | `tasks[project_id]` | **Active** |
| `projects[project_id]` | `locations[project_id]` | **⚠️ INACTIVE** (see below) |
| `tasks[task_id]` | `costs[task_id]` | **Active** |
| `locations[location_id]` | `tasks[location_id]` | **Active** |

**⚠️ Critical gotcha:** if all four relationships are left active, semantic model deployment will fail with:
> `"There are ambiguous paths between 'tasks' and 'projects'"`

This is because there are two live filter paths from `tasks` to `projects` — the direct one, and an indirect
one via `locations`. **Set the `projects → locations` relationship to inactive** to break the cycle. This is
safe: nothing in the app's DAX queries relies on that specific path being active (the one place locations is
filtered by project filters directly on `locations[project_id]`, not via relationship propagation).

### Measures

Add a hidden `_Measures` calculated table (`= ROW("Value", BLANK())` pattern) with these DAX measures — exact
names matter, the app queries them by name:

- `Total Projects`, `At Risk Project Count`, `Delayed Project Count`, `On Track Project Count`,
  `Outlier Project Count`
- `Total Tasks`, `Completed Task Count`, `In Progress Task Count`, `Delayed Task Count`
- `Avg Risk Score`, `Avg Project Delay Days`, `Max Project Delay Days`
- `Total Actual Cost`, `Total Planned Cost`, `Total Cost Overrun`, `Cost Overrun %`

See `docs/02_semantic_model_setup.md` in the repo for the exact DAX for each measure.

### ⚠️ Critical gotcha — Direct Lake "framing" refresh

**Right after creating the semantic model, DAX queries against it will fail** with errors like:
> `"The value for 'Total Projects' cannot be determined"` or `"Failed to resolve name 'projects'"`

This is expected — a brand-new Direct Lake model needs an initial refresh to load the OneLake Delta table
metadata. **Trigger one refresh** (Fabric portal: right-click the model → Refresh; or via API: `POST
.../datasets/{id}/refreshes`) before testing any measures. It completes in seconds (`refreshType:
DirectLakeFraming`).

### Validate before moving on

Confirm:
- `[Total Projects]` returns `20`
- `[Total Tasks]`, `[Total Actual Cost]`, `[Total Cost Overrun]` all return nonzero values
- `projects[status]` contains `On Track`, `At Risk`, `Delayed`

---

## Step 7 — Point the app at your semantic model

Get your **workspace ID** and the new **semantic model's item ID** (from its Fabric portal URL), then edit
`apps/Jobsite_Twin/fabric.yaml`:

```yaml
activeProfile: default
profiles:
  default:
    semanticModels:
      model:
        workspaceId: <YOUR-WORKSPACE-ID>
        itemId: <YOUR-JOBSITE-SM-ITEM-ID>
```

**Do not rename `model`** — the app's query layer references that connection alias by name.

**⚠️ Do not commit this file with your IDs in it.** It's tracked by Git for convenience, but real
workspace/tenant IDs shouldn't go into the shared repo. Keep this as an uncommitted local change, and run
`git diff -- apps/Jobsite_Twin/fabric.yaml` periodically to make sure you haven't accidentally staged it.
If you ever run `git checkout -- fabric.yaml` to clean up your working tree for any reason, remember it will
silently revert this fix too — re-check it before your next deploy.

---

## Step 8 — Install, log in, and deploy (in this order)

**⚠️ Order matters.** `npm run dev`/`npm run build` both have `predev`/`prebuild` hooks that call `rayfin env`,
which needs you to already be logged in and have a deployed app target. Do login/deploy **before** building.

```bash
cd apps/Jobsite_Twin
npm install

npx rayfin login
npx rayfin up --workspace "<your-workspace-name>"
```

This creates the Fabric App backend, applies the `Comment` entity's database config, and deploys the static
frontend (it runs its own build step internally).

### ⚠️ Watch for — database config sometimes fails on first attempt

You may see:
```
× Database configuration failed: No rayfin/.temp/compiled/data/*.js files found
💡 You can manually run 'rayfin up db apply' after the workload is ready
```

This appears to be a timing/race condition in the deploy pipeline — it doesn't happen every time, but when it
does, the fix is exactly what the CLI suggests:

```bash
npx rayfin up db apply
```

This compiles fresh and applies the `Comment` entity's config. Check the response includes an incrementing
`"version"` number to confirm it applied.

### Then run tests

```bash
npm test        # should show all tests passing (165 as of 2026-07-28; more may be added later)
npm run build   # should complete with no TypeScript errors
```

---

## Step 9 — Open and test the app

1. Open the Fabric portal URL that `rayfin up` printed (something like
   `https://app.fabric.microsoft.com/groups/<workspace-id>/appbackends/<item-id>`).
2. You should see the **Portfolio Overview** with KPIs, status donut, risk scatter, and cost-overrun table —
   all populated with live data.
3. Click into any project to see the **3D Zone Model** (Status / Construction toggle), project comments panel,
   and tasks grid with per-task comment counts.
4. Test the 3D viewer controls: mouse drag to rotate/pan, scroll or `+`/`-` to zoom, arrow keys to tilt,
   `R` to reset view, `Esc` to clear selection, `E` to explode/collapse. A collapsible instructions panel and
   status legend/filter are also in the Status view.
5. Try posting a project-level comment and a task-level comment — both should appear immediately and persist
   on refresh.

### If you see a "PowerBIEntityNotFound" / 404 error

This almost always means `fabric.yaml` still has the **wrong** semantic model IDs (e.g. reverted back to
someone else's IDs by an accidental `git checkout`). Double-check Step 7 and redeploy.

---

## Known non-blocking gotchas (safe to ignore)

- `npm install` may show an `EPERM` warning trying to clean up a stale `node_modules/@vscode/deviceid` folder —
  harmless Windows file-lock issue.
- A few `act(...)` warnings from React Testing Library in some component specs — pre-existing test noise, not
  failures.
- Vite build warns about chunk sizes over 500kB — cosmetic, not an error.
- The `Comment` entity logs "No primary key found for Comment, adding default 'id' field" during deploy — this
  is expected and documented in the entity's code comments (the installed Rayfin SDK hardcodes its PK field
  name to `id`; `comment_id` remains an application-level UUID).

---

## Reference

- Original setup docs in the repo: `docs/00_workspace_setup.md` through `docs/03_ontology_setup.md`
- Semantic model measure DAX: `docs/02_semantic_model_setup.md`
- Comments feature spec: `docs/7.7_specification.md`, `docs/7.7_test_plan.md`
- 3D viewer enhancement spec: `docs/zoom-enhancement.md`
- Known Rayfin CLI friction points: `RAYFIN_PG_FEEDBACK.md`

*Guide compiled 2026-07-28 from an actual end-to-end deployment session — every gotcha above was hit and
fixed live, not theoretical.*
