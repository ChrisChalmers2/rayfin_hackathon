//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AlertTriangle, CalendarClock, Clock, DollarSign, TrendingUp } from "lucide-react";
import { formatValue } from "@microsoft/fabric-visuals-core";
import { projectDetailKpis } from "@/queries/project-detail";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { KpiCard, type KpiAccent } from "../portfolio/kpi-card.component";

interface KpiConfig {
    field: string;
    label: string;
    icon: typeof DollarSign;
    accent: KpiAccent;
}

const KPIS: KpiConfig[] = [
    { field: "TotalActualCost", label: "Total Actual Cost", icon: DollarSign, accent: "neutral" },
    { field: "TotalCostOverrun", label: "Total Cost Overrun", icon: TrendingUp, accent: "warning" },
    { field: "DelayedTaskCount", label: "Delayed Tasks", icon: CalendarClock, accent: "danger" },
    { field: "MaxProjectDelayDays", label: "Max Delay (days)", icon: Clock, accent: "danger" },
];

/** Project-scoped KPI card row for the detail page. */
export function DetailKpiRow({ projectId }: { projectId: string }) {
    const { connection, query, columnMetadata } = projectDetailKpis(projectId);
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
        const formatted = formatValue(row?.[i], col.format);
        valueByField.set(col.name, formatted == null ? "—" : String(formatted));
    });

    return (
        <div className="grid grid-cols-1 gap-l sm:grid-cols-2 lg:grid-cols-4">
            {KPIS.map((k) => (
                <KpiCard
                    key={k.field}
                    label={k.label}
                    value={valueByField.get(k.field) ?? "—"}
                    icon={k.icon}
                    accent={k.accent}
                />
            ))}
        </div>
    );
}
