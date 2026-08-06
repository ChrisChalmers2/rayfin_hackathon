//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

/** Instruction rows shown in the help card, in display order. */
const CONTROLS: { keys: string; action: string }[] = [
    { keys: "Left-click drag", action: "rotate" },
    { keys: "Right-click drag", action: "pan" },
    { keys: "Scroll or +/-", action: "zoom" },
    { keys: "Arrow keys", action: "rotate / tilt" },
    { keys: "Click floor or task", action: "select" },
    { keys: "Esc", action: "clear selection" },
    { keys: "Reset view button or R", action: "reset camera" },
    { keys: "Explode button or E", action: "explode / collapse" },
];

/**
 * Bottom-left camera/keyboard instruction card. Collapsible, default-open on
 * each page load. Covers mouse, keyboard, selection, reset, and explode
 * interactions in one place so first-time users don't need external
 * documentation (Phase 3).
 */
export function CameraHelpHint() {
    const [collapsed, setCollapsed] = useState(false);

    const toggle = () => {
        setCollapsed((prev) => !prev);
    };

    return (
        <div className="absolute bottom-m left-m z-10 max-w-[280px]">
            {collapsed ? (
                <button
                    type="button"
                    onClick={toggle}
                    aria-label="Show 3D viewer controls"
                    aria-expanded={false}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-card/90 p-xs text-foreground shadow-sm backdrop-blur transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <HelpCircle className="icon-size-100" aria-hidden />
                </button>
            ) : (
                <div
                    role="region"
                    aria-label="3D viewer controls"
                    className="pointer-events-auto rounded-lg border border-border bg-popover/95 px-s py-xs shadow-lg backdrop-blur"
                >
                    <div className="flex items-center justify-between gap-s">
                        <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground">
                            Viewer controls
                        </span>
                        <button
                            type="button"
                            onClick={toggle}
                            aria-label="Hide 3D viewer controls"
                            aria-expanded={true}
                            className="inline-flex items-center justify-center rounded-md p-xxs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="icon-size-100" aria-hidden />
                        </button>
                    </div>
                    <div className="mt-xxs flex flex-col gap-xxs">
                        {CONTROLS.map((c) => (
                            <div key={c.keys} className="flex items-center justify-between gap-s">
                                <span className="text-100 leading-200 text-foreground">{c.keys}</span>
                                <span className="text-100 leading-200 text-muted-foreground">{c.action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
