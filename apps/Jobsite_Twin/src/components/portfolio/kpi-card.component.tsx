//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiAccent = "neutral" | "warning" | "danger";

interface KpiCardProps {
    label: string;
    /** Pre-formatted display value (e.g. "$10,749,033"). */
    value: string;
    icon: LucideIcon;
    accent?: KpiAccent;
    /** When provided, the card becomes an interactive filter toggle. */
    onClick?: () => void;
    /** Highlights the card as the active filter (only meaningful with onClick). */
    active?: boolean;
}

const ACCENT_BAR: Record<KpiAccent, string> = {
    neutral: "bg-primary",
    warning: "bg-[#d97706]",
    danger: "bg-[#c62828]",
};

const ACCENT_ICON: Record<KpiAccent, string> = {
    neutral: "text-primary",
    warning: "text-[#d97706]",
    danger: "text-[#c62828]",
};

/** Presentational KPI tile — label, large numeric value, and an accent icon. */
export function KpiCard({ label, value, icon: Icon, accent = "neutral", onClick, active = false }: KpiCardProps) {
    const interactive = typeof onClick === "function";
    const className = cn(
        "relative flex flex-col gap-m overflow-hidden rounded-2xl border bg-card p-l text-left",
        active ? "border-ring ring-2 ring-ring" : "border-border",
        interactive &&
            "cursor-pointer transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    );

    const content = (
        <>
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", ACCENT_BAR[accent])} />
            <div className="flex items-center justify-between gap-s">
                <span className="font-heading font-semibold uppercase tracking-wide text-200 leading-200 text-muted-foreground">
                    {label}
                </span>
                <Icon className={cn("icon-size-300 shrink-0", ACCENT_ICON[accent])} aria-hidden />
            </div>
            <span className="font-numeric font-semibold text-hero-800 leading-hero-800 text-foreground tabular-nums">
                {value}
            </span>
        </>
    );

    if (interactive) {
        return (
            <button type="button" onClick={onClick} aria-pressed={active} className={className}>
                {content}
            </button>
        );
    }

    return <div className={className}>{content}</div>;
}
