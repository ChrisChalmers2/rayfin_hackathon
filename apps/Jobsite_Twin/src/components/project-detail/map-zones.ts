//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { QueryTable } from "@microsoft/fabric-app-data";
import { toDataTable, type ColumnMetadataMap } from "@/lib/to-data-table";
import { toRowObjects, toNumber } from "./row-objects";
import type { Zone } from "./types";

/**
 * Pure mapping from a raw SDK query table + column metadata to an array of
 * {@link Zone} objects. Shared by the 3D scene (which renders the zones) and
 * the detail page (which resolves the selected Zone for the task panel), so
 * the row-shaping logic lives in exactly one place.
 */
export function mapZones(table: QueryTable, columnMetadata: ColumnMetadataMap): Zone[] {
    return toRowObjects(toDataTable(table, columnMetadata)).map((r) => ({
        locationId: String(r.LocationId ?? ""),
        zoneName: String(r.ZoneName ?? ""),
        x: toNumber(r.XCoord),
        y: toNumber(r.YCoord),
        z: toNumber(r.ZCoord),
        delayed: toNumber(r.DelayedCount),
        atRisk: toNumber(r.AtRiskCount),
        onTrack: toNumber(r.OnTrackCount),
        complete: toNumber(r.CompleteCount),
        totalTasks: toNumber(r.TotalTasks),
    }));
}
