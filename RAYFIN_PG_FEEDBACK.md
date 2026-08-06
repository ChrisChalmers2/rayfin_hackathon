# Rayfin PG Feedback — Field Findings from Task 7.7

This is a running list of rough edges we hit while using Rayfin to build a real feature (Task 7.7 — adding a comments backend with non-spoofable user identity). It's written for the **Rayfin Product Group** and intended to be shared via the CAT Feedback Tool. Everything here is real friction we ran into, not hypotheticals.

Colleagues: please add anything you hit while working in this repo. There's a copy-paste template at the bottom — just drop a new section in and keep the plain-language tone. The goal is to make this genuinely useful for the folks who can fix it, so describe the *pain* and the *impact*, not just the symptom.

---

### PG-7 — App bundle resets after F64 PayGo pause/resume

- **What we hit:** When the Fabric F64 (Pay-As-You-Go) capacity is paused and later resumed, the deployed Rayfin app backend/bundle doesn't come back with it — the deployment is effectively gone until you redeploy.
- **Why it matters:** Anyone who pauses capacity to save money (which is the whole point of PayGo) comes back to what looks like a broken app, with no obvious signal that a redeploy is all that's needed.
- **Suggested fix:**
  - a) Persist the app bundle across pause/resume so it just comes back.
  - b) Auto-restore the deployment when the capacity resumes.
  - c) At minimum, document the behavior clearly and tell people the one-liner to fix it (`npx rayfin up`).
- **How we found it:** We paused our PayGo capacity between work sessions during Task 7.7 and the deployed app was gone on resume until we re-ran the deploy.

### Claims-mechanism — Only sub/email/role claims are documented; server-side function handlers aren't

- **What we hit:** The only user claims you can reach in a policy are `sub`, `email`, and `role`. There's no documented way to get a display name, UPN, or object ID. And if you want to do identity logic *server-side* inside a function, the handler signature and how claims are exposed there simply aren't documented (the functions package is flagged experimental).
- **Why it matters:** You can't build anything that needs a friendly display name or server-side identity handling (like posting a notification "from" a real person) without guessing at undocumented APIs.
- **Suggested fix:**
  - a) Document the function handler signature and exactly how claims show up server-side.
  - b) Expose more OIDC claims (name / preferred_username / oid) to the policy DSL.
  - c) Clarify whether functions are actually supported on the Fabric host, or still experimental-only.
- **How we found it:** We ran two documentation deep-dives while designing non-spoofable comment identity and kept hitting the edge of what's documented.

### PG-8 — `dialect: mssql` is required but not defaulted

- **What we hit:** Turning on the data service (`data.enabled: true`) fails with "Dialect is required when the Data module is enabled." You have to also add `dialect: mssql` by hand — even though that's the only value Fabric supports.
- **Why it matters:** The very first thing a new data user does throws an error, and the error doesn't tell you the exact field and value to add.
- **Suggested fix:**
  - a) Default `dialect` to `mssql` (the only Fabric-supported option) so it just works.
  - b) Or make the error name the exact field and value to add.
  - c) Or scaffold it into the config automatically when the data service is enabled.
- **How we found it:** Our first deploy after enabling the data service failed with a 400 and no hint about the missing field.

### PG-9 — Strict TypeScript compile sweeps the whole project during db-config

- **What we hit:** The database-config step runs a strict, whole-project TypeScript compile (no relaxed checking). So unrelated, pre-existing type issues elsewhere in the app blocked our backend schema deploy.
- **Why it matters:** A backend schema deploy shouldn't fail because of unrelated frontend or test-file type errors — it couples two things that have nothing to do with each other and sends you hunting in the wrong place.
- **Suggested fix:**
  - a) Scope the compile to the entity files (the `rayfin/data` folder) only.
  - b) Or use the same relaxed check the app's own build uses.
  - c) Or clearly state up front which files the check actually covers.
- **How we found it:** The db-config compile flagged two test files that had nothing to do with our data entity.

### PG-10 — The "no compiled entity files" error hides the real layout requirement

- **What we hit:** We got a "No compiled entity files found" error with no explanation of what layout is expected or what's actually supposed to produce those files.
- **Why it matters:** The message describes a symptom (missing output) rather than the cause (missing compiler config), so you burn time fixing the wrong thing — we restructured our entity files based on this message when that wasn't the problem at all.
- **Suggested fix:**
  - a) Detect and name the real cause (for us it was a missing `rayfin/tsconfig.json` — see PG-11).
  - b) Link to the expected entity layout right in the error.
  - c) Add an earlier setup check that fails with an actionable message.
- **How we found it:** We got the identical error twice even after correcting our entity file layout, which is what tipped us off that the layout was never the issue.

### PG-11 — Missing `rayfin/tsconfig.json` when flipping data on (silent compile failure)

- **What we hit:** Enabling the data service doesn't scaffold a `rayfin/tsconfig.json`. Without that file, the entity compile step emits nothing — silently — and then db-config fails with the cryptic error above. Copying the file from the template fixed it instantly.
- **Why it matters:** A required file is missing with zero prompting, and the failure is silent: the compile reports success but produces no output, so there's nothing pointing you at the actual gap.
- **Suggested fix:**
  - a) Scaffold `rayfin/tsconfig.json` automatically when the data service is enabled.
  - b) Detect its absence and emit a clear, actionable error.
  - c) Document it as a prerequisite for using the data service.
- **How we found it:** We traced the empty compile output back to a missing `rayfin/tsconfig.json` by comparing our project against the CLI's starter template.

---

## How to add to this file

Found something? Copy the template below, fill it in, and add it as a new `###` section above this one. Keep it plain-language — imagine you're explaining it to the person who has to fix it over coffee.

```markdown
### PG-XX — <short punchy title>

- **What we hit:** <1-2 sentences describing the pain in plain English>
- **Why it matters:** <1 sentence on the impact to whoever's using it>
- **Suggested fix:**
  - a) <option>
  - b) <option>
  - c) <option>
- **How we found it:** <1 sentence of context — what were you doing when this bit you>
```
