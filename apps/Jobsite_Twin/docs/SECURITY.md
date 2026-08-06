# Security

> **Status: Task 7.8 security pass completed for the public sample.** Re-run these checks before publishing any future snapshot.

## Scope and findings

The Task 7.8 review covered:

- **Secret & identifier hygiene** - `fabric.yaml` uses placeholder GUIDs, `rayfin.yml` uses a placeholder redirect URL, `.env.example` files document local-only values, and generated deployment artifacts are ignored.
- **Dependency review** - run `npm audit` from this app folder before each public publication.
- **DAX injection surface** - user-influenced filters should continue to route through the sentinel-substitution helpers instead of raw query concatenation.
- **Auth & data access** - the app uses Fabric/Rayfin auth context and fetches data on demand. The camera help hint no longer persists UI state to browser storage.
- **Lint/security rules** - run `npm run lint`, `npm test -- --run`, and `npm run build` before each public publication.

## Required checks before publication

Run targeted searches for private tenant names, admin accounts, deployed Fabric
app hosts, private repository owners, OneLake paths, and browser storage APIs in
source files. Then run `gitleaks dir`, `npm audit`, `npm run lint`,
`npm test -- --run`, and `npm run build`.
