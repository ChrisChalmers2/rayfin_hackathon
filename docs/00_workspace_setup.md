# Workspace Setup — Connecting Your Own Fabric Environment

This project was built against a specific Fabric workspace. When you clone this repo, you'll want to either:
- **(A) Use the shared team workspace** — get the workspaceId and itemId from a teammate, plug them in, and go
- **(B) Point at your own workspace** — set up a fresh Fabric workspace + semantic model + Rayfin app and update the config

This doc walks through both.

## What you need
- A Microsoft Fabric workspace (any capacity — trial, F-SKU, or PayGo)
- Permission to create Lakehouses, Semantic Models, and Ontologies in that workspace
- A Rayfin publishable key (get from a teammate — this is in `.env.local`, gitignored)

## Path A: Use the shared team workspace
- Get `workspaceId`, `itemId` (semantic model), and `.env.local` contents from a teammate
- Paste `workspaceId` and `itemId` into `apps/Jobsite_Twin/fabric.yaml`
- Save `.env.local` at `apps/Jobsite_Twin/.env.local`
- You're done — run `pnpm install` then `cd apps/Jobsite_Twin && npx rayfin up`

## Path B: Point at your own workspace
1. Create a Fabric workspace (name it whatever you like — e.g., "Jobsite Analytics Demo")
2. Create a Lakehouse in that workspace (recommended name: `The_Jobsite_LH`) — see docs/01_lakehouse_setup.md
3. Create a Semantic Model on top of the Lakehouse (recommended name: `Jobsite_SM`) — see docs/02_semantic_model_setup.md
4. (Optional) Create an Ontology — see docs/03_ontology_setup.md
5. Grab your workspace ID and semantic model item ID:
   - Workspace ID: from the URL when viewing your workspace (`https://app.fabric.microsoft.com/groups/<workspaceId>/...`)
   - Semantic model item ID: from the URL when viewing the semantic model
6. Update `apps/Jobsite_Twin/fabric.yaml` with your values
7. Update `apps/Jobsite_Twin/rayfin/rayfin.yml` `allowedRedirectUris` — replace the existing hosting URL with your own once you deploy the Rayfin app
8. Create `.env.local` at `apps/Jobsite_Twin/.env.local` and populate it with your Rayfin publishable key (get from teammate)

## After config is updated

    cd apps/Jobsite_Twin
    pnpm install   # or npm install, if that's your convention
    npx rayfin up

First deploy takes ~3-4 minutes. If you hit "No compiled entity files found" — check that `rayfin/tsconfig.json` exists (see RAYFIN_PG_FEEDBACK.md item PG-11).
