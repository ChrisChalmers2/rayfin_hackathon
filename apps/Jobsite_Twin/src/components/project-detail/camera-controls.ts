//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure keyboard-shortcut mapping and orbit/zoom/reset camera math for the 3D
 * zone scene. Kept free of Three.js / react-three-fiber so it can be
 * unit-tested in isolation; `project-zone-scene.component.tsx` applies these
 * values to the live `OrbitControls` instance and camera each frame/keypress.
 *
 * Shortcuts implemented (see docs/zoom-enhancement.md Q5):
 *   - Arrow keys: orbit/tilt the camera around the current target.
 *   - `+` / `=`: zoom in. `-` / `_`: zoom out.
 *   - `R`: reset the camera to its default framing.
 *   - `Esc`: clear the selected floor.
 *   - `E`: toggle explode/collapse.
 */

/** Discrete camera/scene actions a keypress can trigger. */
export type CameraAction =
    | "rotate-left"
    | "rotate-right"
    | "tilt-up"
    | "tilt-down"
    | "zoom-in"
    | "zoom-out"
    | "reset"
    | "clear-selection"
    | "toggle-explode";

const KEY_ACTION_MAP: Record<string, CameraAction> = {
    ArrowLeft: "rotate-left",
    ArrowRight: "rotate-right",
    ArrowUp: "tilt-up",
    ArrowDown: "tilt-down",
    "+": "zoom-in",
    "=": "zoom-in",
    "-": "zoom-out",
    _: "zoom-out",
    r: "reset",
    R: "reset",
    Escape: "clear-selection",
    e: "toggle-explode",
    E: "toggle-explode",
};

/** Resolves a `KeyboardEvent.key` value to a {@link CameraAction}, or `null` if unmapped. */
export function mapKeyToCameraAction(key: string): CameraAction | null {
    return KEY_ACTION_MAP[key] ?? null;
}

/** Per-keypress orbit step, in radians (5 degrees). */
export const ORBIT_STEP_RADIANS = Math.PI / 36;
/** Per-keypress zoom multiplier; zoom-in multiplies distance by this, zoom-out divides. */
export const ZOOM_STEP_FACTOR = 0.9;

/** Matches the `OrbitControls` `minPolarAngle` configured in the scene. */
export const MIN_POLAR_ANGLE = 0.1;
/** Matches the `OrbitControls` `maxPolarAngle` configured in the scene. */
export const MAX_POLAR_ANGLE = Math.PI - 0.1;
/** Matches the `OrbitControls` `minDistance` configured in the scene. */
export const MIN_DISTANCE = 5;
/** Matches the `OrbitControls` `maxDistance` configured in the scene. */
export const MAX_DISTANCE = 60;

/** Default camera position the scene starts at and `Reset view` restores. */
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [18, 16, 18];

type Vec3 = [number, number, number];

/** A camera position expressed as spherical coordinates around a target. */
export interface SphericalPosition {
    /** Distance from the target. */
    radius: number;
    /** Azimuthal angle (radians) around the Y axis. */
    theta: number;
    /** Polar angle (radians) from the +Y axis. */
    phi: number;
}

/** Converts a world-space camera position, relative to a target, into spherical coordinates. */
export function toSpherical(position: Vec3, target: Vec3): SphericalPosition {
    const dx = position[0] - target[0];
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const theta = Math.atan2(dx, dz);
    const phi = radius === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, dy / radius)));
    return { radius, theta, phi };
}

/** Converts spherical coordinates around a target back into a world-space position. */
export function fromSpherical(spherical: SphericalPosition, target: Vec3): Vec3 {
    const { radius, theta, phi } = spherical;
    const sinPhiRadius = radius * Math.sin(phi);
    return [
        target[0] + sinPhiRadius * Math.sin(theta),
        target[1] + radius * Math.cos(phi),
        target[2] + sinPhiRadius * Math.cos(theta),
    ];
}

/**
 * Orbits a camera position around `target` by `deltaTheta` (azimuth) and
 * `deltaPhi` (polar), clamping the polar angle so the camera cannot flip over
 * the top or bottom of the building.
 */
export function orbit(
    position: Vec3,
    target: Vec3,
    deltaTheta: number,
    deltaPhi: number,
    minPolarAngle = MIN_POLAR_ANGLE,
    maxPolarAngle = MAX_POLAR_ANGLE,
): Vec3 {
    const spherical = toSpherical(position, target);
    const theta = spherical.theta + deltaTheta;
    const phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi + deltaPhi));
    return fromSpherical({ radius: spherical.radius, theta, phi }, target);
}

/**
 * Dollies a camera position toward/away from `target` by multiplying its
 * distance by `factor` (< 1 zooms in, > 1 zooms out), clamped to
 * `[minDistance, maxDistance]`.
 */
export function dolly(
    position: Vec3,
    target: Vec3,
    factor: number,
    minDistance = MIN_DISTANCE,
    maxDistance = MAX_DISTANCE,
): Vec3 {
    const spherical = toSpherical(position, target);
    const radius = Math.max(minDistance, Math.min(maxDistance, spherical.radius * factor));
    return fromSpherical({ ...spherical, radius }, target);
}

/**
 * Computes the world-space center of the floor stack — the point the
 * `OrbitControls` target and `Reset view` both aim at — respecting the
 * CURRENT (collapsed or mid-explode) slab spacing.
 */
export function computeStackCenter(baseY: number, levelCount: number, spacing: number): Vec3 {
    const levels = Math.max(levelCount, 1);
    return [0, baseY + ((levels - 1) * spacing) / 2, 0];
}
