# Lakehouse Validation

This folder contains validation for the synthetic **Construction Intelligence** dataset produced by the data-generation notebook.

## What the script does

[`01_validate_lakehouse.sql`](01_validate_lakehouse.sql) runs a suite of **20 checks** against the four tables (`projects`, `tasks`, `costs`, `locations`) written by the notebook. The checks cover:

- **Row counts & volumes** — total counts per table, and that they fall within the expected ranges (e.g., 20 projects; `costs` is exactly `3 × tasks`).
- **Primary-key uniqueness** — `project_id`, `task_id`, `cost_id`, and `location_id` are each unique.
- **Referential integrity** — no orphan rows across the `tasks → projects`, `costs → projects`, `costs → tasks`, `locations → projects`, and `tasks → locations` relationships.
- **Dependency chain** — every `dependency_task_id` resolves to a real task, and each project has exactly one root task (a task with a null dependency).
- **Realism markers** — some `projects` and `tasks` intentionally have a null `actual_end_date`, and exactly 2 projects are flagged as outliers.
- **Causal spot-check** — a ranking query confirming that delayed/outlier projects show the largest cost overruns.

## Where to run it

Run the script against the **SQL analytics endpoint** of the Fabric **Lakehouse** where the notebook wrote its tables. The Lakehouse is **schema-enabled**, so all tables live under the `dbo` schema (the script references them as `dbo.projects`, `dbo.tasks`, etc.).

## What to look for

The script returns **three result sets**:

1. **Row counts** — an informational grid showing the total number of rows in `projects`, `tasks`, `costs`, and `locations`.
2. **Unified PASS/FAIL summary** — all integrity checks combined into a single grid, one row per check. **A healthy dataset returns `status = 'PASS'` for every row.** Any `FAIL` names the specific integrity or volume check that did not hold.
3. **Causal leaderboard** — projects ranked by total cost overrun. The two outlier projects (`is_outlier = 1`) should dominate the top of the list, confirming that schedule delay drives cost overrun.

## Gotcha: `is_outlier = 1`, not `= TRUE`

The Fabric SQL analytics endpoint is **T-SQL**, which does **not** accept `TRUE` / `FALSE` as boolean literals. Delta boolean columns (like `is_outlier`) surface as the T-SQL **`BIT`** type, so you must filter with `= 1` / `= 0`:

```sql
-- Correct
WHERE is_outlier = 1

-- Fails on the SQL analytics endpoint
WHERE is_outlier = TRUE
```
