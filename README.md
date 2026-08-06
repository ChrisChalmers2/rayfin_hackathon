# Construction Intelligence Demo

> **Public sample note:** Deployment-specific Fabric and Rayfin values have been replaced with placeholders. Review **[./SECURITY.md](SECURITY.md)** before publishing your own fork or adding environment-specific files.

An end-to-end demo that turns a **construction general contractor's** project portfolio into an interactive, Fabric-hosted digital twin — from synthetic data generation all the way to a 3D web app.

> **Status:** Public-safe sample after the Task 7.8 security pass. Replace placeholder configuration values before deploying to your own Fabric workspace.

## Current Status

**Task 7.7 — Comments with Entra ID (Phase 1) shipped on 2026-07-07.** The comments backend is live: a Rayfin DAB `Comment` entity with server-side row-level security that makes comment authorship non-spoofable (the database rejects any write where the author doesn't match the signed-in user).

- 📋 **Full picture:** [HANDOFF-TASK-7.7.md](HANDOFF-TASK-7.7.md) — what shipped, what's left, how to run it locally, and known gotchas.
- 🗒️ **Rayfin PG feedback backlog:** [RAYFIN_PG_FEEDBACK.md](RAYFIN_PG_FEEDBACK.md) — field findings for the Rayfin product team, collected while building this.

**Ready to pick up (Phase 2):** the honest-vs-spoofed insert test to prove the identity guard in practice, UI wiring for the comment threads, and a decision on the auto-added primary key. The broader roadmap continues with Task 7.8 (security audit), 7.9 (alerts), 7.10 (README refinement), and 8 (Data Agent grounding).

> **Before you push to the shared repo:** double-check the secret-hygiene notes in the handoff — a couple of config files still carry workspace/deployment identifiers that need a decision first.

**F2 — Teams Notification for Delayed Tasks:** scaffold and data entity are done in a new sibling app, `apps/Delayed_Task_Notifier/`. Deploy is currently blocked on this session's tenant access, not the app itself — any team member with Global Admin should be able to pick it up and finish it.

- 📋 **Full picture:** [HANDOFF-TASK-F2.md](HANDOFF-TASK-F2.md) — what shipped, what's left, how to run it locally, and known gotchas.
- 🛠️ **Build prompt:** [docs/F2_HANDOFF_PROMPT.md](docs/F2_HANDOFF_PROMPT.md) — a self-contained, step-by-step prompt to paste into your own Copilot session and continue the build.
- 🗒️ **Tracking:** [GitHub issue #2](https://github.com/ChrisChalmers2/rayfin_hackathon/issues/2).

## What's in this repo

| Path | What it is |
|---|---|
| `notebooks/` | `01_synthetic_data_construction.ipynb` — a PySpark notebook that generates a deterministic synthetic construction dataset (20 projects, 116 zones, 347 tasks, 1,041 cost rows) and writes it to a Fabric Lakehouse as Delta tables. This is the **reproducibility entry point** for all demo data. |
| `apps/Jobsite_Twin/` | **Jobsite Twin** — a React web app that embeds in Microsoft Fabric and reads the semantic model over that data live via DAX. Portfolio overview + a single-project 3D digital twin. See its [README](apps/Jobsite_Twin/README.md). |
| `apps/Jobsite_Twin/docs/` | Architecture, customization, and security notes for the app. |
| `apps/Delayed_Task_Notifier/` | **Delayed Task Notifier (F2)** — a Rayfin app that sends a Teams Adaptive Card when a task flips to `delayed`. Scaffold + entity done; deploy pending tenant access. See its [README](apps/Delayed_Task_Notifier/README.md). |
| `docs/` | Data-layer setup guides for standing up your own Fabric environment — [00 workspace](docs/00_workspace_setup.md), [01 lakehouse](docs/01_lakehouse_setup.md), [02 semantic model](docs/02_semantic_model_setup.md), [03 ontology](docs/03_ontology_setup.md) — plus the consolidated [Team Deployment Guide](docs/TEAM_DEPLOYMENT_GUIDE.md) with real-world gotchas from an end-to-end deploy. |
| `validation/` | SQL / validation helpers for the Lakehouse tables. |

## The scenario

A construction general contractor wants a single pane of glass across its active jobsites: which projects are at risk, where cost is overrunning, and — per project — a 3D "twin" of the building that colors each zone by the worst status of the work happening there. The data is fully **synthetic and anonymized** (no real organizations), but modeled to behave like real P6 schedules and ERP cost breakdowns.

## Getting started

The demo is two stages: **generate the data**, then **run the app**.

> **Setting up your own Fabric environment?** Walk the data-layer guides in order: [docs/00_workspace_setup.md](docs/00_workspace_setup.md) → [docs/01_lakehouse_setup.md](docs/01_lakehouse_setup.md) → [docs/02_semantic_model_setup.md](docs/02_semantic_model_setup.md) → [docs/03_ontology_setup.md](docs/03_ontology_setup.md). The ontology (docs/03) is a **Task 8 deliverable** (Data Agent grounding) — optional until then.

> **Deploying to your own team/tenant?** Use [docs/TEAM_DEPLOYMENT_GUIDE.md](docs/TEAM_DEPLOYMENT_GUIDE.md) instead — a single, gotcha-annotated walkthrough (Lakehouse schema flag, semantic model ambiguous-path fix, Direct Lake framing refresh, `fabric.yaml` secret-hygiene, `rayfin up db apply` race condition) distilled from an actual end-to-end deployment on 2026-07-28.

### 1. Generate the data (notebook)

1. Import `notebooks/01_synthetic_data_construction.ipynb` into your Fabric workspace.
2. Attach any Lakehouse and click **Run all**. It deterministically (SEED=42) writes `dbo.projects`, `dbo.tasks`, `dbo.costs`, and `dbo.locations`, then runs three validation cells that assert the output is correct.
3. Build/refresh a Direct Lake semantic model over those tables.

### 2. Run the app (Jobsite Twin)

```bash
cd apps/Jobsite_Twin
npm install
npm run dev
```

The app runs inside the Fabric portal embed flow. Full setup, architecture, and customization details are in **[apps/Jobsite_Twin/README.md](apps/Jobsite_Twin/README.md)**.

### 3. Run the app (Delayed Task Notifier / F2)

```bash
cd apps/Delayed_Task_Notifier
.\scripts\setup-f2.ps1
npx rayfin up --workspace "<your-workspace-name>"
```

Full setup and current status are in **[apps/Delayed_Task_Notifier/README.md](apps/Delayed_Task_Notifier/README.md)** and **[HANDOFF-TASK-F2.md](HANDOFF-TASK-F2.md)**.

## License

Licensed under the MIT license — see the app folder's `LICENSE`.
