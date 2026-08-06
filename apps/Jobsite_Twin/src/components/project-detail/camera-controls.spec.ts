//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
    mapKeyToCameraAction,
    toSpherical,
    fromSpherical,
    orbit,
    dolly,
    computeStackCenter,
    ORBIT_STEP_RADIANS,
    ZOOM_STEP_FACTOR,
    MIN_POLAR_ANGLE,
    MAX_POLAR_ANGLE,
    MIN_DISTANCE,
    MAX_DISTANCE,
} from "./camera-controls";

describe("mapKeyToCameraAction", () => {
    it("maps arrow keys to orbit/tilt actions", () => {
        expect(mapKeyToCameraAction("ArrowLeft")).toBe("rotate-left");
        expect(mapKeyToCameraAction("ArrowRight")).toBe("rotate-right");
        expect(mapKeyToCameraAction("ArrowUp")).toBe("tilt-up");
        expect(mapKeyToCameraAction("ArrowDown")).toBe("tilt-down");
    });

    it("maps + / = to zoom-in and - / _ to zoom-out", () => {
        expect(mapKeyToCameraAction("+")).toBe("zoom-in");
        expect(mapKeyToCameraAction("=")).toBe("zoom-in");
        expect(mapKeyToCameraAction("-")).toBe("zoom-out");
        expect(mapKeyToCameraAction("_")).toBe("zoom-out");
    });

    it("maps R/r to reset, Escape to clear-selection, E/e to toggle-explode", () => {
        expect(mapKeyToCameraAction("r")).toBe("reset");
        expect(mapKeyToCameraAction("R")).toBe("reset");
        expect(mapKeyToCameraAction("Escape")).toBe("clear-selection");
        expect(mapKeyToCameraAction("e")).toBe("toggle-explode");
        expect(mapKeyToCameraAction("E")).toBe("toggle-explode");
    });

    it("returns null for unmapped keys", () => {
        expect(mapKeyToCameraAction("a")).toBeNull();
        expect(mapKeyToCameraAction("Tab")).toBeNull();
        expect(mapKeyToCameraAction(" ")).toBeNull();
    });
});

describe("toSpherical / fromSpherical", () => {
    it("round-trips a position around a target", () => {
        const position: [number, number, number] = [18, 16, 18];
        const target: [number, number, number] = [0, 5, 0];
        const spherical = toSpherical(position, target);
        const roundTripped = fromSpherical(spherical, target);
        expect(roundTripped[0]).toBeCloseTo(position[0], 10);
        expect(roundTripped[1]).toBeCloseTo(position[1], 10);
        expect(roundTripped[2]).toBeCloseTo(position[2], 10);
    });

    it("computes radius as the straight-line distance to the target", () => {
        const spherical = toSpherical([3, 4, 0], [0, 0, 0]);
        expect(spherical.radius).toBeCloseTo(5, 10);
    });
});

describe("orbit", () => {
    const target: [number, number, number] = [0, 5, 0];
    const position: [number, number, number] = [18, 16, 18];

    it("preserves distance to target while rotating", () => {
        const before = toSpherical(position, target).radius;
        const rotated = orbit(position, target, ORBIT_STEP_RADIANS, 0);
        const after = toSpherical(rotated, target).radius;
        expect(after).toBeCloseTo(before, 10);
    });

    it("changes the azimuthal angle when rotating left/right", () => {
        const before = toSpherical(position, target).theta;
        const rotatedRight = orbit(position, target, ORBIT_STEP_RADIANS, 0);
        const afterRight = toSpherical(rotatedRight, target).theta;
        expect(afterRight).toBeCloseTo(before + ORBIT_STEP_RADIANS, 10);
    });

    it("clamps the polar angle so the camera cannot flip over the top or bottom", () => {
        // Push phi far past the max in one huge step; result must clamp, not wrap.
        const rotated = orbit(position, target, 0, 10, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE);
        const spherical = toSpherical(rotated, target);
        expect(spherical.phi).toBeLessThanOrEqual(MAX_POLAR_ANGLE + 1e-9);
        expect(spherical.phi).toBeGreaterThanOrEqual(MIN_POLAR_ANGLE - 1e-9);
    });
});

describe("dolly", () => {
    const target: [number, number, number] = [0, 5, 0];
    const position: [number, number, number] = [18, 16, 18];

    it("shrinks the distance to target when zooming in", () => {
        const before = toSpherical(position, target).radius;
        const zoomed = dolly(position, target, ZOOM_STEP_FACTOR, MIN_DISTANCE, MAX_DISTANCE);
        const after = toSpherical(zoomed, target).radius;
        expect(after).toBeCloseTo(before * ZOOM_STEP_FACTOR, 6);
        expect(after).toBeLessThan(before);
    });

    it("grows the distance to target when zooming out", () => {
        const before = toSpherical(position, target).radius;
        const zoomed = dolly(position, target, 1 / ZOOM_STEP_FACTOR, MIN_DISTANCE, MAX_DISTANCE);
        const after = toSpherical(zoomed, target).radius;
        expect(after).toBeGreaterThan(before);
    });

    it("clamps to minDistance", () => {
        const veryClose: [number, number, number] = [target[0], target[1] + MIN_DISTANCE, target[2]];
        const zoomed = dolly(veryClose, target, 0.1, MIN_DISTANCE, MAX_DISTANCE);
        expect(toSpherical(zoomed, target).radius).toBeCloseTo(MIN_DISTANCE, 6);
    });

    it("clamps to maxDistance", () => {
        const veryFar: [number, number, number] = [target[0], target[1] + MAX_DISTANCE, target[2]];
        const zoomed = dolly(veryFar, target, 10, MIN_DISTANCE, MAX_DISTANCE);
        expect(toSpherical(zoomed, target).radius).toBeCloseTo(MAX_DISTANCE, 6);
    });
});

describe("computeStackCenter", () => {
    it("centers on a single floor at baseY", () => {
        expect(computeStackCenter(0.6, 1, 0.9)).toEqual([0, 0.6, 0]);
    });

    it("centers between the bottom and top slab for a multi-floor collapsed stack", () => {
        const [, y] = computeStackCenter(0.6, 5, 0.9);
        expect(y).toBeCloseTo(0.6 + (4 * 0.9) / 2, 10);
    });

    it("uses the live (exploded) spacing, not a fixed constant", () => {
        const collapsed = computeStackCenter(0.6, 5, 0.9);
        const exploded = computeStackCenter(0.6, 5, 3.2);
        expect(exploded[1]).toBeGreaterThan(collapsed[1]);
    });

    it("treats zero/negative level counts as a single level", () => {
        expect(computeStackCenter(0.6, 0, 0.9)).toEqual([0, 0.6, 0]);
    });
});
