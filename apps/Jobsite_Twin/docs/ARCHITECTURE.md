# Architecture

Jobsite Twin is a single-page React app that runs embedded in the Microsoft Fabric portal and reads a Power BI semantic model live via DAX. This document covers the moving parts a contributor needs to understand.

## Routing & code-splitting

- A small local hash router drives two routes: the portfolio overview (`/`) and the single-project detail (`/project/:projectId`).
- The project-detail route is **lazy-loaded**. Its module (which pulls in three.js / react-three-fiber for the 3D scene) is a separate build chunk, so the portfolio landing page never pays the 3D bundle cost. Keep the detail route lazy — the `/project` chunk staying code-split is a build invariant we verify after changes.
- Back navigation uses `navigate(-1)` and falls back to `/` when there is no history entry (direct deep-link), preserving the portfolio's `?status=` filter.

## Data layer

### Query factories + sentinel substitution
All DAX lives in `.dax` files under `src/queries/`, grouped by page. Each visualization has a factory `.ts` that imports the raw `.dax` (`?raw`) and returns `{ connection, query, columnMetadata }` (plus `vegaLiteSpec` for chart visuals).

Parameterized queries use a **`"__PROJECT_ID__"` sentinel** in the `.dax` file. The factory substitutes the real id through a shared `applyProjectId` helper that **doubles any embedded double-quotes** so the value can't break out of the DAX string literal — a lightweight injection guard. Structural query variants (different GROUP BY / aggregation) get separate `.dax` files rather than string-built queries.

### Column metadata
Each factory exports a `columnMetadata: ColumnMetadataMap` keyed by the **exact** column name the SDK returns (copied verbatim from `npx fabric-app-data query` output). Values provide a cleaned field `name`, a human `displayName`, and an optional `format`. `toDataTable(table, columnMetadata)` merges the raw `QueryTable` into a `DataTable` for visuals and row-object access.

### SDK caching
`@microsoft/fabric-app-data` keeps an in-memory LRU cache keyed by connection + query. Identical queries return cached results instantly, so two components issuing the same query (e.g. the 3D scene and the detail page both reading zones) share one network round-trip. `bypassCache: true` forces a refetch; `clearQueryCache()` clears it. The SDK never throws — failures come back as `data.status === "error"`.

### Synthetic data source (notebook)
- The semantic model is populated from a single **reproducibility entry point** — `notebooks/01_synthetic_data_construction.ipynb` (repo root). It is deterministic (SEED=42) and idempotent (overwrite-mode Delta writes to `dbo.projects / tasks / costs / locations`), so any run reproduces identical data. Task→zone placement is driven by a `TASK_ZONE_AFFINITY` map and gated by in-notebook validation assertions. See [CUSTOMIZATION.md](CUSTOMIZATION.md) for how to adapt it.

## State model

- Selection is owned by the nearest common parent (`SingleProjectDetail`) as a single `selectedLocationId: string | null`.
- The setter is **toggle-to-clear**: selecting the already-selected zone clears it.
- Children are controlled: the 3D scene and the tasks grid receive the value and a callback; they never hold their own copy.

## Shared lookups (map helpers)

The zones query result is shaped once by the pure `mapZones(table, columnMetadata): Zone[]` helper, then used to derive two memoized maps off already-loaded state (no extra fetch):

- `zonesById: Map<locationId, Zone>` — resolves the selected zone for the task panel.
- `locationIdByZoneName: Map<zoneName, locationId>` — lets the tasks grid drive 3D selection.

**Why `locationIdByZoneName` exists:** `DataGrid` builds its `onInteraction` select predicates **only from the columns in its `columns` prop**, not from every field of the datum. So the tasks grid keys row-click selection off its visible **`ZoneName`** column, and the parent resolves that name back to a location id. This is safe because `zone_name` is unique per project (a precondition — see CUSTOMIZATION.md).

## 3D scene

- Built with **react-three-fiber + drei**. Zones become stacked floor slabs; `computeZoneStackOrder` parses `zone_name` (Basement lowest, `Floor N` numeric, unknown names sorted above known floors) into a bottom→top order.
- The **exploded view** animates slab spacing off React via refs + `useFrame` (no per-frame re-render); the orbit pivot re-centers on the live stack extent during the tween while preserving a user's manual pan once settled.
- Corner columns extend and a roof cap repositions each frame from a shared animation ref, giving the "building" read. Slab color is worst-status-wins per zone.

## Testing

Vitest, specs colocated as `<name>.spec.ts(x)`. Pure helpers (`mapZones`, `computeZoneStackOrder`, `columnHeight`/`columnPositions`, `applyProjectId` escaping) are unit-tested; query factories have specs asserting the query text and metadata mapping. Keep the suite green and add cases rather than weakening assertions.
