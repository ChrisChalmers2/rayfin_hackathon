# Ontology Setup — Jobsite_Ont

The ontology is the layer that enables agent-shaped reasoning across entities and their relationships. It sits alongside the semantic model but plays a different role.

## Recommended name
`Jobsite_Ont`

## Semantic Model vs Ontology — quick framing
- **Semantic Model** answers "how many, how much, what's the average" (metrics and measures)
- **Ontology** answers "what is a Project, how does a Delayed Task relate to Risk Score, which zones are affected" (entities, relationships, and cross-domain reasoning)

Add an ontology when:
- The same entity (like a Project) is modeled differently across multiple systems and needs a canonical definition
- Multiple agents or surfaces need to share the same semantic contract
- Governance needs to be enforced at the concept level, not just the metric level

For this project, the ontology grounds the Data Agent so it can reason about project → task → location → cost relationships.

## Entity types and their bindings

| Entity Type | Key | Instance Display Name | Bound to Lakehouse table |
|---|---|---|---|
| **Project** | `project_id` | `project_name` | `projects` |
| **Task** | `task_id` | `task_name` | `tasks` |
| **Cost** | `cost_id` | `cost_category` | `costs` |
| **Location** | `location_id` | `zone_name` | `locations` |

## Relationships

- **Project has-many Tasks** — via `tasks[project_id]`
- **Project has-many Locations** — via `locations[project_id]`
- **Task has-many Costs** — via `costs[task_id]`
- **Task located-in Location** — via `tasks[location_id]`

## How to build it in Fabric

1. In the workspace, open the semantic model `Jobsite_SM` and click **Generate Ontology** in the ribbon (Ontology group)
   - Alternatively, create a new Ontology item directly on `The_Jobsite_LH`
2. Define the four entity types listed above, using the correct keys and display names
3. Bind each entity to its Lakehouse table
4. Define the four relationships listed above
5. Publish/refresh the ontology

## Known preview issues (as of Task 7 timeframe)

These are documented in RAYFIN_PG_FEEDBACK.md and in Rocio's session findings — heads up to colleagues:

- Base entity type may show "Loading..." permanently on all entities (UI bug)
- Entity Type Overview charts may fail with InternalServerError 500 despite correct bindings
- Ontology may need OneLake shortcuts if binding to KQL/EventHouse instead of Lakehouse
- Regenerating an Ontology from a Semantic Model doesn't always correctly sync new entities — if you hit sync weirdness, try building fresh from Lakehouse tables

## Why this matters for Task 8
Once Task 8 (Data Agent grounding) is done, the Data Agent will ground on BOTH:
- `Jobsite_SM` — for the "how many / how much" questions (measures)
- `Jobsite_Ont` — for the "what and how connected" questions (entities and relationships)

This dual-grounding is what makes agentic Q&A trustworthy and traceable back to canonical business definitions.
