//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Moon, Sun, TriangleAlert } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { useHashLocation, useHashNavigate, useHashParams } from "@/lib/hash-router";
import { toDataTable } from "@/lib/to-data-table";
import { projectDetailHeader, projectDetailTasks, projectDetailZones } from "@/queries/project-detail";
import { Panel } from "../portfolio/panel.component";
import { DetailKpiRow } from "./detail-kpi-row.component";
import { ProjectZoneScene } from "./project-zone-scene.component";
import { ConstructionTwinScene } from "./construction-twin-scene.component";
import { ZoneTaskPanel } from "./zone-task-panel.component";
import { ProjectTasksTable } from "./project-tasks-table.component";
import { ProjectCommentsPanel } from "./project-comments-panel.component";
import { TaskCommentsDrawer, type SelectedTask } from "./task-comments-drawer.component";
import { StatusPill } from "./status-pill.component";
import { mapZones } from "./map-zones";
import { toRowObjects, toNumber } from "./row-objects";
import type { ProjectTask, Zone } from "./types";

/** Compact risk-score stat shown in the detail header. */
function RiskScoreStat({ value }: { value: number }) {
    const accent = value >= 70 ? "#c62828" : value >= 40 ? "#d97706" : "#2e7d32";
    return (
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card px-l py-m">
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accent }} />
            <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-muted-foreground">
                Risk Score
            </span>
            <span className="font-numeric font-semibold text-500 leading-500 text-foreground tabular-nums">
                {Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
            </span>
        </div>
    );
}

/**
 * Single Project Detail — the drill-through target from the portfolio
 * scatter. Shows project header/status/risk, project-scoped KPIs, an
 * interactive 3D zone scene, a per-zone task panel, and a task grid.
 * All values are fetched live from the "Jobsite_SM" semantic model.
 */
export function SingleProjectDetail() {
    const { projectId = "" } = useHashParams();
    const { isDark, toggleTheme } = useThemeContext();
    const navigate = useHashNavigate();
    const location = useHashLocation();
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [selectedTaskComments, setSelectedTaskComments] = useState<SelectedTask | null>(null);
    const [constructionView, setConstructionView] = useState(false);
    const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

    // Toggle selection — clicking the already-selected zone or task clears it,
    // matching the portfolio donut's click-to-clear pattern.
    const handleToggleLocation = useCallback(
        (locationId: string) => {
            setSelectedLocationId((prev) => (prev === locationId ? null : locationId));
        },
        [],
    );

    // Back returns to the previous entry (preserving the portfolio's ?status=
    // filter). When the detail page was opened directly (no history), fall
    // back to the portfolio landing route.
    const handleBack = useCallback(() => {
        if (location.key === "default") navigate("/");
        else navigate(-1);
    }, [location.key, navigate]);

    const header = projectDetailHeader(projectId);
    const headerQuery = useSemanticModelQuery({ connection: header.connection, query: header.query });

    // Cached alongside ProjectTasksTable (same query) — feeds the zone panel.
    const tasks = projectDetailTasks(projectId);
    const tasksQuery = useSemanticModelQuery({ connection: tasks.connection, query: tasks.query });

    // Zones fetch is cache-shared with the 3D scene (identical query). Used only
    // to resolve the selected Zone object for the task panel from selectedLocationId.
    const zones = projectDetailZones(projectId);
    const zonesQuery = useSemanticModelQuery({ connection: zones.connection, query: zones.query });

    const zonesById = useMemo(() => {
        if (zonesQuery.data?.status !== "success") return new Map<string, Zone>();
        return new Map(mapZones(zonesQuery.data.table, zones.columnMetadata).map((z) => [z.locationId, z]));
    }, [zonesQuery.data, zones.columnMetadata]);

    // Reverse lookup zone_name -> location id. The tasks table drives 3D
    // selection off its visible "Zone" column (the DataGrid only emits select
    // predicates for rendered columns), and zone_name is unique per project, so
    // this map resolves a clicked task's zone name back to the location id that
    // keys the scene's selection. Derived from the zones data already loaded for
    // the scene — no extra fetch.
    const locationIdByZoneName = useMemo(() => {
        const map = new Map<string, string>();
        for (const zone of zonesById.values()) map.set(zone.zoneName, zone.locationId);
        return map;
    }, [zonesById]);

    const handleSelectZoneName = useCallback(
        (zoneName: string) => {
            const locationId = locationIdByZoneName.get(zoneName);
            if (locationId) handleToggleLocation(locationId);
        },
        [locationIdByZoneName, handleToggleLocation],
    );

    const handleSelectTaskComments = useCallback((taskId: string, taskName: string) => {
        setSelectedTaskComments({ taskId, taskName });
    }, []);

    const handleCloseTaskComments = useCallback(() => {
        setSelectedTaskComments(null);
    }, []);

    // Bumps to force ProjectTasksTable to refetch per-task comment counts after
    // a comment is posted in the task drawer (that write happens outside the
    // table's own data flow, since comments live in Rayfin, not the semantic model).
    const handleCommentPosted = useCallback(() => {
        setCommentsRefreshKey((k) => k + 1);
    }, []);

    const selectedZone = selectedLocationId ? (zonesById.get(selectedLocationId) ?? null) : null;

    const headerRow = useMemo(() => {
        if (headerQuery.data?.status !== "success") return null;
        const t = toDataTable(headerQuery.data.table, header.columnMetadata);
        const obj = toRowObjects(t)[0];
        if (!obj) return null;
        return {
            projectName: String(obj.ProjectName ?? projectId),
            status: String(obj.Status ?? ""),
            riskScore: toNumber(obj.RiskScore),
            isOutlier: obj.IsOutlier === true || obj.IsOutlier === "true",
        };
    }, [headerQuery.data, header.columnMetadata, projectId]);

    const projectTasks = useMemo<ProjectTask[]>(() => {
        if (tasksQuery.data?.status !== "success") return [];
        return toRowObjects(toDataTable(tasksQuery.data.table, tasks.columnMetadata)).map((r) => ({
            taskId: String(r.TaskId ?? ""),
            taskName: String(r.TaskName ?? ""),
            taskStatus: String(r.TaskStatus ?? ""),
            locationId: String(r.LocationId ?? ""),
            delayDays: r.DelayDays == null ? null : toNumber(r.DelayDays),
        }));
    }, [tasksQuery.data, tasks.columnMetadata]);

    const headerError =
        headerQuery.error ?? (headerQuery.data?.status === "error" ? new Error(headerQuery.data.error.message) : null);

    return (
        <div className="min-h-full w-full bg-background">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-xl p-xl">
                <header className="flex flex-wrap items-start justify-between gap-l">
                    <div className="flex items-start gap-m">
                        <button
                            type="button"
                            onClick={handleBack}
                            aria-label="Back to portfolio"
                            className="flex h-xxxl w-xxxl shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ArrowLeft className="icon-size-200" aria-hidden />
                        </button>
                        <div className="flex flex-col gap-s">
                            {headerQuery.isLoading ? (
                                <div className="h-[28px] w-[260px] animate-pulse rounded-md bg-muted" />
                            ) : (
                                <h1 className="font-heading font-bold uppercase tracking-wide text-600 leading-600 text-foreground m-0">
                                    {headerRow?.projectName ?? projectId}
                                </h1>
                            )}
                            <div className="flex flex-wrap items-center gap-s">
                                <span className="font-base text-200 leading-200 text-muted-foreground">
                                    {projectId}
                                </span>
                                {headerRow?.status ? <StatusPill status={headerRow.status} /> : null}
                                {headerRow?.isOutlier ? (
                                    <span className="inline-flex items-center gap-xs rounded-full border border-[#d97706]/50 bg-[#d97706]/10 px-s py-xxs font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-[#d97706]">
                                        <TriangleAlert className="icon-size-100" aria-hidden />
                                        Outlier
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-stretch gap-m">
                        {headerRow ? <RiskScoreStat value={headerRow.riskScore} /> : null}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            className="flex h-xxxl w-xxxl shrink-0 items-center justify-center self-start rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {isDark ? <Sun className="icon-size-200" aria-hidden /> : <Moon className="icon-size-200" aria-hidden />}
                        </button>
                    </div>
                </header>

                {headerError ? (
                    <div className="flex items-start gap-s rounded-2xl border border-destructive/40 bg-destructive/10 px-l py-m text-destructive">
                        <AlertTriangle className="icon-size-200 shrink-0" aria-hidden />
                        <p className="font-base text-200 leading-200 m-0">{headerError.message}</p>
                    </div>
                ) : null}

                <DetailKpiRow projectId={projectId} />

                <div className="grid grid-cols-1 gap-xl lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Panel
                            title={constructionView ? "Construction Twin" : "Zone Model"}
                            subtitle={
                                constructionView
                                    ? "Live build progress by floor — % complete, with electrical & plumbing layers"
                                    : "Interactive 3D site — colored by worst task status per zone"
                            }
                            bodyClassName="h-[440px] p-s"
                            actions={
                                <div className="inline-flex overflow-hidden rounded-xl border border-border">
                                    <button
                                        type="button"
                                        onClick={() => setConstructionView(false)}
                                        aria-pressed={!constructionView}
                                        className={`px-m py-xs font-heading font-semibold uppercase tracking-wide text-100 leading-200 transition-colors ${
                                            !constructionView ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-hover"
                                        }`}
                                    >
                                        Status
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConstructionView(true)}
                                        aria-pressed={constructionView}
                                        className={`px-m py-xs font-heading font-semibold uppercase tracking-wide text-100 leading-200 transition-colors ${
                                            constructionView ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-hover"
                                        }`}
                                    >
                                        Construction
                                    </button>
                                </div>
                            }
                        >
                            {constructionView ? (
                                <ConstructionTwinScene projectId={projectId} isDark={isDark} />
                            ) : (
                                <ProjectZoneScene
                                    projectId={projectId}
                                    isDark={isDark}
                                    selectedLocationId={selectedLocationId}
                                    onSelectZone={(zone) => handleToggleLocation(zone.locationId)}
                                    onClearSelection={() => setSelectedLocationId(null)}
                                />
                            )}
                        </Panel>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-full lg:min-h-[500px]">
                            <ZoneTaskPanel zone={selectedZone} tasks={projectTasks} />
                        </div>
                    </div>
                </div>

                <ProjectTasksTable
                    projectId={projectId}
                    onSelectZoneName={handleSelectZoneName}
                    onSelectTaskComments={handleSelectTaskComments}
                    commentsRefreshKey={commentsRefreshKey}
                />

                <ProjectCommentsPanel projectId={projectId} />
            </div>

            <TaskCommentsDrawer
                projectId={projectId}
                task={selectedTaskComments}
                onClose={handleCloseTaskComments}
                onCommentPosted={handleCommentPosted}
            />
        </div>
    );
}
