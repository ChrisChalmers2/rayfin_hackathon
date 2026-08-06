//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { parseZoneSortKey, computeZoneStackOrder, UNKNOWN_SORT_KEY } from "./floor-stack";

/** Minimal zone shape accepted by the pure ordering helpers. */
const z = (zoneName: string) => ({ zoneName });

describe("parseZoneSortKey", () => {
    it("puts Basement below floor 1 (sortKey -1)", () => {
        expect(parseZoneSortKey("Basement")).toEqual({ known: true, sortKey: -1 });
    });

    it("maps 'Floor N' to N", () => {
        expect(parseZoneSortKey("Floor 1").sortKey).toBe(1);
        expect(parseZoneSortKey("Floor 3").sortKey).toBe(3);
    });

    it("is case- and whitespace-insensitive", () => {
        expect(parseZoneSortKey("  basement ")).toEqual({ known: true, sortKey: -1 });
        expect(parseZoneSortKey("FLOOR 2").sortKey).toBe(2);
    });

    it("flags unrecognized names as unknown", () => {
        expect(parseZoneSortKey("Rooftop").known).toBe(false);
        expect(parseZoneSortKey("Parking").known).toBe(false);
    });

    it("maps 'Exterior' to a grade-level key between Basement and Floor 1", () => {
        expect(parseZoneSortKey("Exterior")).toEqual({ known: true, sortKey: -0.5 });
        expect(parseZoneSortKey("  exterior ")).toEqual({ known: true, sortKey: -0.5 });
    });

    it("maps 'Roof' to the top-of-stack key (100)", () => {
        expect(parseZoneSortKey("Roof")).toEqual({ known: true, sortKey: 100 });
        expect(parseZoneSortKey("ROOF")).toEqual({ known: true, sortKey: 100 });
    });

    it("leaves 'Mechanical Room' unrecognized with the capped fallback key", () => {
        expect(parseZoneSortKey("Mechanical Room")).toEqual({ known: false, sortKey: UNKNOWN_SORT_KEY });
    });
});

describe("computeZoneStackOrder", () => {
    it("orders known floors bottom -> top regardless of input order", () => {
        const out = computeZoneStackOrder([z("Floor 2"), z("Floor 3"), z("Floor 1")]);
        expect(out.map((s) => s.zone.zoneName)).toEqual(["Floor 1", "Floor 2", "Floor 3"]);
        expect(out.map((s) => s.level)).toEqual([0, 1, 2]);
    });

    it("always places Basement at the bottom regardless of input order", () => {
        const out1 = computeZoneStackOrder([z("Floor 1"), z("Basement"), z("Floor 2")]);
        expect(out1[0].zone.zoneName).toBe("Basement");
        expect(out1[0].level).toBe(0);

        const out2 = computeZoneStackOrder([z("Basement"), z("Floor 1")]);
        expect(out2[0].zone.zoneName).toBe("Basement");
    });

    it("places unknown-named zones alphabetically ABOVE all known floors", () => {
        const out = computeZoneStackOrder([z("Parking"), z("Floor 1"), z("Annex"), z("Basement")]);
        expect(out.map((s) => s.zone.zoneName)).toEqual(["Basement", "Floor 1", "Annex", "Parking"]);
    });

    it("assigns contiguous 0-based levels bottom -> top", () => {
        const out = computeZoneStackOrder([z("Floor 2"), z("Basement")]);
        expect(out.map((s) => s.level)).toEqual([0, 1]);
        expect(out[0].zone.zoneName).toBe("Basement");
    });

    it("places Exterior between Basement and Floor 1", () => {
        const out = computeZoneStackOrder([z("Floor 1"), z("Exterior"), z("Basement")]);
        expect(out.map((s) => s.zone.zoneName)).toEqual(["Basement", "Exterior", "Floor 1"]);
    });

    it("always places Roof at the top of a 3-floor stack", () => {
        const out = computeZoneStackOrder([
            z("Basement"),
            z("Floor 1"),
            z("Floor 2"),
            z("Floor 3"),
            z("Roof"),
        ]);
        expect(out.map((s) => s.zone.zoneName)).toEqual([
            "Basement",
            "Floor 1",
            "Floor 2",
            "Floor 3",
            "Roof",
        ]);
        expect(out[out.length - 1].zone.zoneName).toBe("Roof");
        expect(out[out.length - 1].level).toBe(4);
    });

    it("always places Roof at the top of a 5-floor stack (regardless of floor count)", () => {
        const out = computeZoneStackOrder([
            z("Roof"),
            z("Floor 5"),
            z("Floor 4"),
            z("Floor 3"),
            z("Floor 2"),
            z("Floor 1"),
        ]);
        expect(out[out.length - 1].zone.zoneName).toBe("Roof");
        expect(out[out.length - 1].level).toBe(5);
    });

    it("stacks an unknown Mechanical Room below the Roof", () => {
        const out = computeZoneStackOrder([z("Floor 1"), z("Roof"), z("Mechanical Room")]);
        expect(out.map((s) => s.zone.zoneName)).toEqual(["Floor 1", "Mechanical Room", "Roof"]);
    });

    it("orders a full 7-zone project bottom -> top with Roof on top", () => {
        const out = computeZoneStackOrder([
            z("Floor 1"),
            z("Floor 2"),
            z("Floor 3"),
            z("Basement"),
            z("Mechanical Room"),
            z("Exterior"),
            z("Roof"),
        ]);
        expect(out.map((s) => s.zone.zoneName)).toEqual([
            "Basement",
            "Exterior",
            "Floor 1",
            "Floor 2",
            "Floor 3",
            "Mechanical Room",
            "Roof",
        ]);
    });
});
