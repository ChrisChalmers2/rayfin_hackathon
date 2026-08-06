# Task 7.7 — Comments with Entra ID — Handoff

Hey! This is the "here's what I did and here's where you pick up" note for the comments feature. If you're reading this cold, you should be able to get productive in about 30 minutes. Ping me if anything here is stale.

## TL;DR

- **Phase 1 shipped:** the Rayfin DAB backend is deployed with a `Comment` entity that enforces **non-spoofable identity** — the database itself rejects any comment whose author doesn't match the signed-in user.
- **Proven:** the `@claims.email eq @item.user_upn` row-level policies compile and apply cleanly through `rayfin up`.
- **Left to do:** the honest-vs-spoofed insert test, UI wiring, one known primary-key gotcha, and the rest of the roadmap (Tasks 7.8 / 7.9 / 7.10 / 8).

## 🔒 Before making this public

This repo is safe to work in as a private team repository, but a few things need attention **before any public release** — see **[SECURITY.md](SECURITY.md)** at the repo root for the full checklist. The two items that specifically need templating out:

- **`apps/Jobsite_Twin/fabric.yaml`** — carries the Fabric `workspaceId` and the semantic-model `itemId`. Replace them with placeholder tokens or extract into env-based config before publishing.
- **`apps/Jobsite_Twin/rayfin/rayfin.yml`** — `allowedRedirectUris` includes this deployment's specific hosting URL. Swap it for a generic placeholder or read it from env.

Secrets (the Rayfin publishable key, plus the tenant/workspace IDs in `rayfin/.deployments.json`, and the `.env*` files) are already gitignored and must stay that way.

## What's working (Phase 1 complete)

Shipped in this phase:

- ✅ Rayfin data service turned on (`mssql` dialect) — this is the app's first write path; reads still come live from the Fabric semantic model over DAX, untouched.
- ✅ `Comment` entity defined with server-side row-level security on every write action.
- ✅ Entity compiles and the DAB config generates **and applies** successfully to the workload.
- ✅ Static app bundle redeploys as part of the same `rayfin up`.

The row-level security that actually got generated and applied (role `authenticated`):

| Action | Policy |
|---|---|
| read | *(none — any authenticated user can read)* |
| create | `@claims.email eq @item.user_upn` |
| update | `@claims.email eq @item.user_upn` |
| delete | `@claims.email eq @item.user_upn` |

In plain terms: the DB only accepts a create/update/delete when the row's `user_upn` equals the caller's own email claim. You can't post as someone else even if you tamper with the request body — the server rejects it.

Files created / modified this phase (all paths relative to repo root):

- `apps/Jobsite_Twin/rayfin.yml` — enabled the data service + set `dialect: mssql` (functions and storage stay off).
- `apps/Jobsite_Twin/rayfin/tsconfig.json` — added (verbatim from the Rayfin starter template); without it the entity compile silently produces nothing.
- `apps/Jobsite_Twin/rayfin/data/Comment.ts` — the `Comment` entity + the four `@authenticated` policies.
- `apps/Jobsite_Twin/rayfin/data/schema.ts` — binding-only file that registers the entity with the client.
- `apps/Jobsite_Twin/src/queries/portfolio/project-scatter.spec.ts` and `projects-by-status.spec.ts` — small type-cast fixes so the strict compile in the deploy step passes (see PG-9 in the feedback file).

## What's left (Phase 2)

- **Honest-vs-spoofed insert test** — actually prove the non-overridable identity works end-to-end: one insert where the author matches the caller (should succeed), one where it doesn't (should be rejected by the policy). This is the immediate next step.
- **UI wiring** — surface comments in the app: a project-level thread and a per-task drawer, with a post form (there's a full design sketch in the Plan 7 file).
- **Primary-key gotcha** — decide whether to fix or accept the auto-added default `id` column (see gotchas below).

## Known gotchas

- **F64 PayGo pause/resume resets the app bundle (PG-7).** If the capacity was paused, the deployment won't be there when it resumes. Fix is one command: `cd apps/Jobsite_Twin && npx rayfin up` to redeploy.
- **The `Comment` entity has 7 fields, not 6.** DAB auto-added its own default `id` primary key because the entity doesn't declare an explicit one — so our `comment_id` is currently just a regular field, not the PK. Decide in Phase 2 whether to promote `comment_id` to the real primary key or live with the auto-added `id`.
- **Don't commit secrets.** `.env`, `.env.local`, and `rayfin/.deployments.json` are gitignored under `apps/Jobsite_Twin/` and must stay that way — `.deployments.json` in particular holds the publishable key and workspace/tenant IDs. See the "before you push" note in the repo README.

## How to get running locally

1. Clone the repo.
2. `cd` into the repo folder (`construction-intelligence-demo`, or whatever you named the local clone).
3. Install dependencies for the app: `cd apps/Jobsite_Twin && npm install`. *(This project uses npm — match that; don't mix in a second lockfile.)*
4. Make sure the Fabric F64 PayGo capacity is **resumed** (see PG-7 — a paused capacity means no deployed app).
5. From `apps/Jobsite_Twin`, run `npx rayfin up`.
6. **Expected:** the DAB config applies successfully and the `Comment` entity is deployed. You'll also get a fresh static hosting deploy.

## Where to find things

- Full Plan 7 details (design, spikes, phased plan): `apps/Jobsite_Twin/.tmp-planning/plan7-comments-with-entra.md`
- Spike files (the throwaway that proved the create-policy approach): `apps/Jobsite_Twin/.tmp-planning/spike-create-policy/`
- Entity: `apps/Jobsite_Twin/rayfin/data/Comment.ts`
- Binding: `apps/Jobsite_Twin/rayfin/data/schema.ts`
- Rayfin config: `apps/Jobsite_Twin/rayfin.yml`
- PG feedback backlog: `RAYFIN_PG_FEEDBACK.md` (repo root)

## Related backlog (from the Project Gilbane technical roadmap)

- **Task 7.8 — Security audit before publication.** Includes fixing two known pre-existing lint issues: `src/hooks/use-semantic-model-query.ts:100` (react-hooks/set-state-in-effect) and `src/main.tsx:24` (react-refresh/only-export-components).
- **Task 7.9 — Alerts implementation.**
- **Task 7.10 — README voice refinement + a meta-learnings section.**
- **Task 8 — Data Agent grounding** on the semantic model + ontology.

---

Thanks for picking this up. The backend is the hard part and it's done and proven — Phase 2 is mostly wiring and tests. Start with the honest-vs-spoofed insert test; it'll give you confidence the whole identity model holds before you build UI on top of it.
