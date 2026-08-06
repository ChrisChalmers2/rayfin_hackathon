//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import type { QueryTable } from "@microsoft/fabric-app-data";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { mapZones } from "./map-zones";

/** Metadata keyed by the original DAX column names (as the SDK returns them). */
const columnMetadata: ColumnMetadataMap = {
    "locations[location_id]": { name: "LocationId" },
    "locations[zone_name]": { name: "ZoneName" },
    "locations[x_coord]": { name: "XCoord" },
    "locations[y_coord]": { name: "YCoord" },
    "locations[z_coord]": { name: "ZCoord" },
    "[delayed_count]": { name: "DelayedCount" },
    "[at_risk_count]": { name: "AtRiskCount" },
    "[on_track_count]": { name: "OnTrackCount" },
    "[complete_count]": { name: "CompleteCount" },
    "[total_tasks]": { name: "TotalTasks" },
};

const columns = Object.keys(columnMetadata).map((name) => ({ name }));

/** Builds a minimal QueryTable with the standard zone columns. */
function tableWith(rows: unknown[][]): QueryTable {
    return { columns, rows } as unknown as QueryTable;
}

describe("mapZones", () => {
    it("maps each row to a Zone with clean field names", () => {
        const zones = mapZones(
            tableWith([
                ["LOC-1", "Floor 1", 1, 2, 3, 1, 2, 3, 4, 10],
                ["LOC-2", "Basement", 5, 6, 12, 0, 0, 0, 0, 0],
            ]),
            columnMetadata,
        );
        expect(zones).toHaveLength(2);
        expect(zones[0]).toEqual({
            locationId: "LOC-1",
            zoneName: "Floor 1",
            x: 1,
            y: 2,
            z: 3,
            delayed: 1,
            atRisk: 2,
            onTrack: 3,
            complete: 4,
            totalTasks: 10,
        });
        expect(zones[1]).toMatchObject({ locationId: "LOC-2", zoneName: "Basement", z: 12, delayed: 0, totalTasks: 0 });
    });

    it("coerces missing / non-numeric values to sane defaults", () => {
        const [z] = mapZones(tableWith([[null, null, "x", undefined, null, null, null, null, null, null]]), columnMetadata);
        expect(z.locationId).toBe("");
        expect(z.zoneName).toBe("");
        expect(z.x).toBe(0);
        expect(z.delayed).toBe(0);
        expect(z.totalTasks).toBe(0);
    });

    it("returns an empty array for a table with no rows", () => {
        expect(mapZones(tableWith([]), columnMetadata)).toEqual([]);
    });
});
