//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { DataTable } from "@microsoft/fabric-visuals-core";

/**
 * Converts a row-major `DataTable` into an array of objects keyed by each
 * column's (clean) `name`, for ergonomic field access in TypeScript.
 */
export function toRowObjects(table: DataTable): Record<string, unknown>[] {
    return table.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        table.columns.forEach((col, i) => {
            obj[col.name] = row[i];
        });
        return obj;
    });
}

/** Coerces an unknown cell value to a finite number, or 0. */
export function toNumber(value: unknown): number {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}
