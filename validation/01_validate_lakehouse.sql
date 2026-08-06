-- ============================================================
-- Lakehouse Validation — Construction Intelligence Dataset
-- ------------------------------------------------------------
-- Run against: the SQL analytics endpoint of the Lakehouse
--              where the synthetic data notebook wrote its tables.
-- Assumes: schema-enabled Lakehouse (tables live under `dbo`).
--
-- This script returns THREE result sets:
--   1. Row counts across the four tables (informational).
--   2. Unified PASS/FAIL summary — 18 integrity checks in one grid.
--   3. Causal leaderboard — projects ranked by cost overrun; the two
--      outlier projects (is_outlier = 1) should dominate the top.
--
-- Gotcha: the Fabric SQL analytics endpoint uses T-SQL, which
-- does NOT accept `TRUE` / `FALSE` as boolean literals.
-- Delta boolean columns surface as BIT — filter with `= 1` / `= 0`.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Row counts (informational)
-- ------------------------------------------------------------
SELECT 'Row counts' AS check_name,
       (SELECT COUNT(*) FROM dbo.projects)  AS projects,
       (SELECT COUNT(*) FROM dbo.tasks)     AS tasks,
       (SELECT COUNT(*) FROM dbo.costs)     AS costs,
       (SELECT COUNT(*) FROM dbo.locations) AS locations;


-- ------------------------------------------------------------
-- 2. Unified PASS/FAIL summary
-- All 18 integrity checks combined into a single result set.
-- Every row's `status` column should read 'PASS'.
-- ------------------------------------------------------------
SELECT status, check_name
FROM (
    -- Volumes
    SELECT CASE WHEN COUNT(*) = 20 THEN 'PASS' ELSE 'FAIL' END AS status,
           'Projects count == 20' AS check_name, 1 AS ord
    FROM dbo.projects

    UNION ALL SELECT CASE WHEN COUNT(*) BETWEEN 200 AND 500 THEN 'PASS' ELSE 'FAIL' END,
                     'Tasks in [200, 500]', 2 FROM dbo.tasks

    UNION ALL SELECT CASE WHEN (SELECT COUNT(*) FROM dbo.costs)
                              = (SELECT COUNT(*) FROM dbo.tasks) * 3
                          THEN 'PASS' ELSE 'FAIL' END,
                     'Costs == 3 x tasks', 3

    UNION ALL SELECT CASE WHEN COUNT(*) BETWEEN 80 AND 160 THEN 'PASS' ELSE 'FAIL' END,
                     'Locations in [80, 160]', 4 FROM dbo.locations

    -- Primary key uniqueness
    UNION ALL SELECT CASE WHEN COUNT(*) = COUNT(DISTINCT project_id)  THEN 'PASS' ELSE 'FAIL' END,
                     'project_id unique', 5 FROM dbo.projects
    UNION ALL SELECT CASE WHEN COUNT(*) = COUNT(DISTINCT task_id)     THEN 'PASS' ELSE 'FAIL' END,
                     'task_id unique', 6 FROM dbo.tasks
    UNION ALL SELECT CASE WHEN COUNT(*) = COUNT(DISTINCT cost_id)     THEN 'PASS' ELSE 'FAIL' END,
                     'cost_id unique', 7 FROM dbo.costs
    UNION ALL SELECT CASE WHEN COUNT(*) = COUNT(DISTINCT location_id) THEN 'PASS' ELSE 'FAIL' END,
                     'location_id unique', 8 FROM dbo.locations

    -- Referential integrity
    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'No orphan tasks (to projects)', 9
              FROM dbo.tasks t LEFT JOIN dbo.projects p ON t.project_id = p.project_id
              WHERE p.project_id IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'No orphan costs (to projects)', 10
              FROM dbo.costs c LEFT JOIN dbo.projects p ON c.project_id = p.project_id
              WHERE p.project_id IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'No orphan costs (to tasks)', 11
              FROM dbo.costs c LEFT JOIN dbo.tasks t ON c.task_id = t.task_id
              WHERE t.task_id IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'No orphan locations (to projects)', 12
              FROM dbo.locations l LEFT JOIN dbo.projects p ON l.project_id = p.project_id
              WHERE p.project_id IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'No orphan tasks (to locations)', 13
              FROM dbo.tasks t LEFT JOIN dbo.locations l ON t.location_id = l.location_id
              WHERE l.location_id IS NULL

    -- Dependency chain
    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'All dependency_task_id resolve', 14
              FROM dbo.tasks t LEFT JOIN dbo.tasks d ON t.dependency_task_id = d.task_id
              WHERE t.dependency_task_id IS NOT NULL AND d.task_id IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
                     'Exactly 1 root task per project', 15
              FROM (
                  SELECT project_id
                  FROM dbo.tasks
                  WHERE dependency_task_id IS NULL
                  GROUP BY project_id
                  HAVING COUNT(*) != 1
              ) x

    -- Realism markers
    -- Note: use `is_outlier = 1` — Delta booleans surface as BIT in T-SQL.
    UNION ALL SELECT CASE WHEN COUNT(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
                     'Exactly 2 outlier projects', 16 FROM dbo.projects WHERE is_outlier = 1

    UNION ALL SELECT CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
                     'Realism: null actual_end_date on tasks', 17
              FROM dbo.tasks WHERE actual_end_date IS NULL

    UNION ALL SELECT CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
                     'Realism: null actual_end_date on projects', 18
              FROM dbo.projects WHERE actual_end_date IS NULL
) all_checks
ORDER BY ord;


-- ------------------------------------------------------------
-- 3. Causal leaderboard — delay to cost overrun
-- The two outlier projects (is_outlier = 1) should dominate the
-- top rows with the largest project_delay_days and total_cost_overrun.
-- ------------------------------------------------------------
SELECT
    p.project_id,
    p.project_name,
    p.status,
    p.is_outlier,
    p.risk_score,
    DATEDIFF(day, p.planned_end_date, COALESCE(p.actual_end_date, GETDATE())) AS project_delay_days,
    ROUND(SUM(c.actual_cost - c.planned_cost), 2) AS total_cost_overrun
FROM dbo.projects p
JOIN dbo.costs c ON p.project_id = c.project_id
GROUP BY p.project_id, p.project_name, p.status, p.is_outlier, p.risk_score,
         p.planned_end_date, p.actual_end_date
ORDER BY total_cost_overrun DESC;
