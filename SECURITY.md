# Security notes

Read this before publishing changes or adding deployment-specific files.

## Current state for the public sample

The repository has been sanitized for public sample use. Deployment-specific
Fabric and Rayfin values are represented as placeholders, and generated local
artifacts are excluded from the public tree.

## Public-release checks

### 1. Workspace and semantic-model identifiers

File: `apps/Jobsite_Twin/fabric.yaml`

The public sample uses all-zero placeholder GUIDs. Replace them locally with
your own workspace and semantic model IDs before running the app.

### 2. Deployment hosting URL

File: `apps/Jobsite_Twin/rayfin/rayfin.yml`

The public sample uses `https://your-app-hostname.example.com` as the hosted
redirect placeholder. Replace it with your deployed Rayfin app URL after
deployment.

### 3. Secrets and generated files that must not be committed

These files are gitignored and must stay that way:

- `apps/Jobsite_Twin/.env` and `.env.local`
- `apps/Jobsite_Twin/rayfin/.deployments.json`
- `apps/Jobsite_Twin/rayfin/.env`
- `apps/Jobsite_Twin/rayfin/.lockfile.json`
- `apps/Jobsite_Twin/rayfin/.temp/`

If you ever see one of these files in a `git status` output, STOP and fix your
`.gitignore` before committing.

## Task 7.8 publication checklist

- [x] Replace `workspaceId` and `itemId` in `fabric.yaml` with placeholders.
- [x] Replace the hardcoded deployment redirect URL in `rayfin.yml` with a placeholder.
- [x] Add `.env.example` files with placeholder values.
- [x] Remove generated Playwright snapshots and temporary planning files from the public tree.
- [x] Review docs for private repository links, real workspace names, named contacts, and deployment-specific identifiers.
- [x] Confirm targeted source scans for internal tenant IDs, private repo links, named contacts, Fabric app URLs, and browser persistence are clear.
- [ ] Run a full secret scan with Gitleaks before publishing each new public snapshot.
- [ ] Run dependency, lint, test, and build checks before publishing each new public snapshot.

## Reporting a security issue

If you spot a leaked secret or a security concern in this repo, please:

1. Do NOT open a public issue.
2. Report it through the appropriate private channel for the repository owner.
3. If a secret has leaked, rotate it immediately before doing anything else.
