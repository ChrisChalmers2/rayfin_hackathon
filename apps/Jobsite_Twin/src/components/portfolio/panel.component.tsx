//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Extra classes for the scrollable body region. */
    bodyClassName?: string;
}

/**
 * Card surface with an industrial header rule (amber accent tick) used to
 * frame every dashboard section.
 */
export function Panel({ title, subtitle, actions, children, className, bodyClassName }: PanelProps) {
    return (
        <section
            className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
                className,
            )}
        >
            <header className="flex items-start justify-between gap-m border-b border-border px-l py-m">
                <div className="flex items-start gap-s">
                    <span aria-hidden className="mt-xxs h-l w-[3px] rounded-full bg-primary" />
                    <div>
                        <h2 className="font-heading font-semibold uppercase tracking-wide text-300 leading-300 text-foreground m-0">
                            {title}
                        </h2>
                        {subtitle ? (
                            <p className="font-base text-200 leading-200 text-muted-foreground m-0 mt-xxs">
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </header>
            <div className={cn("min-h-0 p-l", bodyClassName)}>{children}</div>
        </section>
    );
}

/** Pulsing placeholder shown while a query is in flight. */
export function PanelSkeleton({ className }: { className?: string }) {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={cn("h-full w-full animate-pulse rounded-xl bg-muted", className)}
        />
    );
}

/** Destructive-styled banner shown when a query returns an error. */
export function PanelError({ message }: { message: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center p-l">
            <div className="flex items-start gap-s rounded-xl border border-destructive/40 bg-destructive/10 px-l py-m text-destructive">
                <AlertTriangle className="icon-size-200 shrink-0" aria-hidden />
                <p className="font-base text-200 leading-200 m-0">{message}</p>
            </div>
        </div>
    );
}

/** Centered muted message shown when a query succeeds but returns no rows. */
export function PanelEmpty({ message = "No data available." }: { message?: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center p-l">
            <p className="font-base text-200 leading-200 text-muted-foreground m-0">{message}</p>
        </div>
    );
}
