//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { buildConstructionFloors } from "./construction-data";
import type { Zone, ProjectTask } from "./types";

function zone(partial: Partial<Zone> & { locationId: string; zoneName: string }): Zone {
    return {
        x: 0,
        y: 0,
        z: 0,
        delayed: 0,
        atRisk: 0,
        onTrack: 0,
        complete: 0,
        totalTasks: 0,
        ...partial,
    };
}

function task(partial: Partial<ProjectTask> & { taskId: string; locationId: string; taskName: string }): ProjectTask {
    return { taskStatus: "On Track", delayDays: null, ...partial };
}

describe("buildConstructionFloors", () => {
    it("orders floors bottom -> top (Basement lowest, Roof highest)", () => {
        const floors = buildConstructionFloors(
            [
                zone({ locationId: "r", zoneName: "Roof" }),
                zone({ locationId: "b", zoneName: "Basement" }),
                zone({ locationId: "f1", zoneName: "Floor 1" }),
            ],
            [],
        );
        expect(floors.map((f) => f.zoneName)).toEqual(["Basement", "Floor 1", "Roof"]);
        expect(floors.map((f) => f.level)).toEqual([0, 1, 2]);
    });

    it("computes buildFraction as complete / totalTasks", () => {
        const [f] = buildConstructionFloors(
            [zone({ locationId: "a", zoneName: "Floor 1", complete: 3, totalTasks: 4 })],
            [],
        );
        expect(f.buildFraction).toBeCloseTo(0.75);
    });

    it("returns buildFraction 0 when the zone has no tasks", () => {
        const [f] = buildConstructionFloors(
            [zone({ locationId: "a", zoneName: "Floor 1", complete: 0, totalTasks: 0 })],
            [],
        );
        expect(f.buildFraction).toBe(0);
    });

    it("clamps buildFraction to a maximum of 1", () => {
        const [f] = buildConstructionFloors(
            [zone({ locationId: "a", zoneName: "Floor 1", complete: 10, totalTasks: 4 })],
            [],
        );
        expect(f.buildFraction).toBe(1);
    });

    it("derives worst-status-wins for the floor", () => {
        const [f] = buildConstructionFloors(
            [zone({ locationId: "a", zoneName: "Floor 1", delayed: 1, onTrack: 2, complete: 5, totalTasks: 8 })],
            [],
        );
        expect(f.status).toBe("Delayed");
    });

    it("flags electrical/plumbing only on floors that have those tasks", () => {
        const floors = buildConstructionFloors(
            [
                zone({ locationId: "f1", zoneName: "Floor 1" }),
                zone({ locationId: "f2", zoneName: "Floor 2" }),
            ],
            [
                task({ taskId: "t1", locationId: "f1", taskName: "Electrical Rough-In" }),
                task({ taskId: "t2", locationId: "f1", taskName: "Plumbing Rough-In" }),
                task({ taskId: "t3", locationId: "f2", taskName: "Framing" }),
            ],
        );
        const f1 = floors.find((f) => f.locationId === "f1")!;
        const f2 = floors.find((f) => f.locationId === "f2")!;
        expect(f1.hasElectrical).toBe(true);
        expect(f1.hasPlumbing).toBe(true);
        expect(f2.hasElectrical).toBe(false);
        expect(f2.hasPlumbing).toBe(false);
    });

    it("matches MEP task names case-insensitively and by substring", () => {
        const [f] = buildConstructionFloors(
            [zone({ locationId: "a", zoneName: "Floor 1" })],
            [task({ taskId: "t1", locationId: "a", taskName: "ELECTRICAL panel install" })],
        );
        expect(f.hasElectrical).toBe(true);
        expect(f.hasPlumbing).toBe(false);
    });
});
