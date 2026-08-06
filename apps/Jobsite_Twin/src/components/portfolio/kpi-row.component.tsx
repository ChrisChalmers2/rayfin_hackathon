//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AlertTriangle, Building2, CalendarClock, DollarSign, Gauge } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { portfolioKpis } from "@/queries/portfolio";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import type { ProjectStatus } from "@/hooks/use-status-filter";
import { KpiCard, type KpiAccent } from "./kpi-card.component";

interface KpiConfig {
    field: string;
    label: string;
    icon: typeof Building2;
    accent: KpiAccent;
}

const KPIS: KpiConfig[] = [
    { field: "TotalProjects", label: "Total Projects", icon: Building2, accent: "neutral" },
    { field: "DelayedProjectCount", label: "Delayed Projects", icon: CalendarClock, accent: "danger" },
    { field: "TotalCostOverrun", label: "Total Cost Overrun", icon: DollarSign, accent: "warning" },
    { field: "AvgRiskScore", label: "Avg Risk Score", icon: Gauge, accent: "neutral" },
];

interface KpiRowProps {
    /** The active status filter, or `null` when the portfolio is unfiltered. */
    status: ProjectStatus | null;
    /** Toggles a status filter (used by the clickable "Delayed Projects" card). */
    onToggleStatus: (status: ProjectStatus) => void;
}

/** Top KPI card row summarizing the whole project portfolio. */
export function KpiRow({ status, onToggleStatus }: KpiRowProps) {
    const { connection, query, columnMetadata } = portfolioKpis({ status: status ?? undefined });
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-l sm:grid-cols-2 lg:grid-cols-4">
                {KPIS.map((k) => (
                    <div
                        key={k.field}
                        role="status"
                        aria-label="Loading"
                        className="h-[104px] animate-pulse rounded-2xl border border-border bg-muted"
                    />
                ))}
            </div>
        );
    }

    if (error || data?.status === "error") {
        const message = error?.message ?? (data?.status === "error" ? data.error.message : "Failed to load KPIs.");
        return (
            <div className="flex items-start gap-s rounded-2xl border border-destructive/40 bg-destructive/10 px-l py-m text-destructive">
                <AlertTriangle className="icon-size-200 shrink-0" aria-hidden />
                <p className="font-base text-200 leading-200 m-0">{message}</p>
            </div>
        );
    }

    if (data?.status !== "success") return null;

    const table = toDataTable(data.table, columnMetadata);
    const row = table.rows[0];
    const valueByField = new Map<string, string>();
    table.columns.forEach((col, i) => {
        const raw = row?.[i];
        const formatted = formatValue(raw, col.format);
        valueByField.set(col.name, formatted == null ? "—" : String(formatted));
    });

    return (
        <div className="grid grid-cols-1 gap-l sm:grid-cols-2 lg:grid-cols-4">
            {KPIS.map((k) => {
                const isDelayedToggle = k.field === "DelayedProjectCount";
                return (
                    <KpiCard
                        key={k.field}
                        label={k.label}
                        value={valueByField.get(k.field) ?? "—"}
                        icon={k.icon}
                        accent={k.accent}
                        onClick={isDelayedToggle ? () => onToggleStatus("Delayed") : undefined}
                        active={isDelayedToggle && status === "Delayed"}
                    />
                );
            })}
        </div>
    );
}
