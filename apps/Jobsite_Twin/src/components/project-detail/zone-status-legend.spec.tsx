//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZoneStatusLegend } from "./zone-status-legend.component";
import { TASK_STATUS_COLORS, NO_TASKS_COLOR } from "./task-status";

describe("ZoneStatusLegend", () => {
    it("lists every task status plus the no-tasks state", () => {
        render(<ZoneStatusLegend />);
        expect(screen.getByText("Delayed")).toBeInTheDocument();
        expect(screen.getByText("At Risk")).toBeInTheDocument();
        expect(screen.getByText("On Track")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();
        expect(screen.getByText("No tasks")).toBeInTheDocument();
    });

    it("colors each swatch from TASK_STATUS_COLORS / NO_TASKS_COLOR so it cannot drift from slab colors", () => {
        render(<ZoneStatusLegend />);
        const region = screen.getByRole("region", { name: "Floor status legend" });
        const swatches = region.querySelectorAll("span[aria-hidden]");
        const colors = Array.from(swatches).map((el) => (el as HTMLElement).style.backgroundColor);

        // jsdom normalizes hex colors to rgb(); compare against the same
        // normalization by reading a detached element's computed style.
        const toRgb = (hex: string) => {
            const probe = document.createElement("span");
            probe.style.backgroundColor = hex;
            return probe.style.backgroundColor;
        };

        expect(colors).toEqual([
            toRgb(TASK_STATUS_COLORS.Delayed),
            toRgb(TASK_STATUS_COLORS["At Risk"]),
            toRgb(TASK_STATUS_COLORS["On Track"]),
            toRgb(TASK_STATUS_COLORS.Complete),
            toRgb(NO_TASKS_COLOR),
        ]);
    });
});
