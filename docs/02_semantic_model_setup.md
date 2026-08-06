# Semantic Model Setup — Jobsite_SM

The semantic model is the **grounding layer** that makes both the app and any AI agent give correct answers. It defines the business meaning of the data, the relationships between entities, and the metrics that matter.

## Recommended name
`Jobsite_SM`

## What sits underneath it
The four Delta tables from `The_Jobsite_LH` (see docs/01_lakehouse_setup.md).

## Tables and business meaning

| Table | Business meaning |
|---|---|
| **projects** | Top-level construction projects with status, budget, and risk metrics. One row per project. |
| **tasks** | Individual construction tasks within a project (Excavation, Foundation, Roofing, etc.). One row per task. |
| **costs** | Planned and actual cost entries associated with tasks. Multiple rows per task. |
| **locations** | Physical zones within each project (Basement, Floor 1, Roof, etc.), with 3D coordinates for the digital twin. One row per zone. |

## Relationships

All relationships are **Active**, **Single-direction** (filter flows from the Dimension side to the Fact side only). This avoids the ambiguous filter path that occurs when a bi-directional or many-to-one link between `tasks` and `locations` creates a diamond with `projects`.

| From (Dimension) | To (Fact) | Cardinality | Direction | Status |
|---|---|---|---|---|
| `projects[project_id]` | `tasks[project_id]` | 1 : many | Single-direction → | Active |
| `projects[project_id]` | `locations[project_id]` | 1 : many | Single-direction → | Active |
| `locations[location_id]` | `tasks[location_id]` | 1 : many | Single-direction → | Active |
| `tasks[task_id]` | `costs[task_id]` | 1 : many | Single-direction → | Active |

> **Why this topology?** `projects` fans out to both `locations` and `tasks`, `locations` fans out to `tasks`, and `tasks` fans out to `costs`. Every filter path is unambiguous because filters always flow one way: Dimension → Fact. There is no diamond — `locations` filters `tasks` directly (not via a many-to-one back-link).

## Measures (organized in a hidden `_Measures` table)

We keep all measures in a hidden `_Measures` table using the `_Measures = {BLANK()}` pattern. This keeps them organized separately from the physical tables and makes them easy to find in the field list.

Each measure description includes **an example question the measure can answer** — this is what grounds the Data Agent for natural-language Q&A.

### Portfolio counts

**At Risk Project Count**

    At Risk Project Count = CALCULATE([Total Projects], projects[status] = "At Risk")

*Answers: How many projects are at risk?*

**Delayed Project Count**
Count of projects with status = "Delayed".
*Answers: How many projects are delayed?*

**On Track Project Count**
Count of projects with status = "On Track".
*Answers: How many projects are on track?*

**Outlier Project Count**
Count of projects flagged as outliers (`is_outlier = TRUE`).
*Answers: How many projects are behaving abnormally?*

**Total Projects**
`COUNTROWS(projects)`
*Answers: How many projects do we have?*

### Task counts and status

**Completed Task Count**

    Completed Task Count =
    CALCULATE(
        COUNTROWS(tasks),
        NOT ISBLANK(tasks[actual_end_date])
    )

*Answers: How many tasks are done?*

**In Progress Task Count**

    In Progress Task Count =
    CALCULATE(
        COUNTROWS(tasks),
        ISBLANK(tasks[actual_end_date])
    )

*Answers: How many tasks are still in progress?*

**Delayed Task Count**

    Delayed Task Count = CALCULATE(COUNTROWS(tasks), tasks[task_status] = "Delayed")

*Answers: How many tasks are running late?*

**Total Tasks**
`COUNTROWS(tasks)`
*Answers: How many tasks do we have across the portfolio?*

### Risk and delay

**Avg Risk Score**

    Avg Risk Score = AVERAGE(projects[risk_score])

*Answers: What is our average project risk?*
Description: Portfolio-wide average risk score on a 0 to 100 scale. Blends schedule pressure and cost uncertainty.

**Avg Project Delay Days**

    Avg Project Delay Days =
    AVERAGEX(
        projects,
        DATEDIFF(
            projects[planned_end_date],
            COALESCE(projects[actual_end_date], TODAY()),
            DAY
        )
    )

*Answers: On average, how many days are our projects delayed?*

**Max Project Delay Days**

    Max Project Delay Days =
    MAXX(
        projects,
        DATEDIFF(
            projects[planned_end_date],
            COALESCE(projects[actual_end_date], TODAY()),
            DAY
        )
    )

Maximum delay in days across all projects.
*Answers: What's the worst delay we have?*

### Cost measures

**Total Actual Cost**
`SUM(costs[actual_cost])`
*Answers: What is the total actual cost across all work?*

**Total Planned Cost**
`SUM(costs[planned_cost])`
*Answers: What was the total planned budget?*

**Total Cost Overrun**
`[Total Actual Cost] - [Total Planned Cost]`
*Answers: How much are we over budget in total dollars?*

**Cost Overrun %**

    Cost Overrun % = DIVIDE([Total Cost Overrun], [Total Planned Cost])

*Answers: What is our overrun rate?*
Description: Total cost overrun as a percentage of total planned cost.

## Why we ground on this
A well-scoped semantic model is what stops an AI agent from inventing metrics. When a user asks "how many projects are at risk?", the Data Agent goes to the `At Risk Project Count` measure — the CALCULATE + filter is defined once, in one place, and always returns the same answer.

**Our philosophy:** many small, scoped semantic models beat one heroic universal model. This model covers construction project analytics only. If we need customer analytics or invoicing later, those get their own models.

## How to build this from scratch
1. In the Fabric workspace, create a new Semantic Model on top of `The_Jobsite_LH`
2. Import the four tables (projects, tasks, costs, locations)
3. Establish the relationships listed above
4. Create the `_Measures` table:
   1. In the model view ribbon, click **New table** (not "New measure").
   2. In the formula bar that appears, enter: `_Measures = {BLANK()}`
   3. Press Enter — this creates a one-row calculated table that exists solely to hold measures.
   4. Right-click the `_Measures` table in the field list and select **Hide in report view** — end users should never see this table directly; they'll interact with the measures inside it.
   5. Optionally hide the auto-generated `Value` column as well.
5. Add each measure to `_Measures` — right-click the `_Measures` table → **New measure**, then paste the DAX from the Measures section above. Include the description with the "what question does this answer" line so a Data Agent can ground on it.
6. Set descriptions on each table using the "business meaning" text above
7. Hide any other columns you don't want the AI to reason over directly
