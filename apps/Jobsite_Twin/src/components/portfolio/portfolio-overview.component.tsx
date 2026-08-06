//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback } from "react";
import { HardHat, Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { useStatusFilter } from "@/hooks/use-status-filter";
import { useHashNavigate } from "@/lib/hash-router";
import { KpiRow } from "./kpi-row.component";
import { ProjectScatter } from "./project-scatter.component";
import { ProjectsByStatusDonut } from "./projects-by-status-donut.component";
import { TopCostOverrunsTable } from "./top-cost-overruns-table.component";
import { StatusFilterChip } from "./status-filter-chip.component";

/**
 * Portfolio Overview — the landing page for Jobsite Twin. Surfaces
 * portfolio KPIs, a project risk scatter, a status donut, and the
 * top cost-overrun table. All values are fetched live from the
 * "Jobsite_SM" semantic model; nothing is hardcoded.
 */
export function PortfolioOverview() {
    const { isDark, toggleTheme } = useThemeContext();
    const navigate = useHashNavigate();
    const { status, toggleStatus, clearStatus } = useStatusFilter();

    // Drill-through to the single-project detail page.
    const handleSelectProject = useCallback(
        (projectId: string) => {
            navigate(`/project/${encodeURIComponent(projectId)}`);
        },
        [navigate],
    );

    return (
        <div className="min-h-full w-full bg-background">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-xl p-xl">
                <header className="flex items-center justify-between gap-m">
                    <div className="flex items-center gap-m">
                        <span className="flex h-xxxl w-xxxl items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                            <HardHat className="icon-size-300" aria-hidden />
                        </span>
                        <div>
                            <h1 className="font-heading font-bold uppercase tracking-wide text-600 leading-600 text-foreground m-0">
                                Jobsite Twin
                            </h1>
                            <p className="font-base text-200 leading-200 text-muted-foreground m-0">
                                Portfolio Overview · Construction Project Intelligence
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        className="flex h-xxxl w-xxxl items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {isDark ? (
                            <Sun className="icon-size-200" aria-hidden />
                        ) : (
                            <Moon className="icon-size-200" aria-hidden />
                        )}
                    </button>
                </header>

                <StatusFilterChip status={status} onClear={clearStatus} />

                <KpiRow status={status} onToggleStatus={toggleStatus} />

                <div className="grid grid-cols-1 gap-xl lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <ProjectScatter onSelectProject={handleSelectProject} status={status} />
                    </div>
                    <div className="lg:col-span-1">
                        <ProjectsByStatusDonut activeStatus={status} onToggleStatus={toggleStatus} />
                    </div>
                </div>

                <TopCostOverrunsTable status={status} onSelectProject={handleSelectProject} />
            </div>
        </div>
    );
}
