//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type KeyboardEvent, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { Layers, RotateCcw } from "lucide-react";
import { projectDetailZones } from "@/queries/project-detail";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { PanelSkeleton, PanelError, PanelEmpty } from "../portfolio/panel.component";
import { BuildingFloorSlab } from "./building-floor-slab.component";
import { BuildingStructure, type ExplodeAnim } from "./building-structure.component";
import { CameraHelpHint } from "./camera-help-hint.component";
import {
    DEFAULT_CAMERA_POSITION,
    MAX_DISTANCE,
    MAX_POLAR_ANGLE,
    MIN_DISTANCE,
    MIN_POLAR_ANGLE,
    ORBIT_STEP_RADIANS,
    ZOOM_STEP_FACTOR,
    computeStackCenter,
    dolly,
    mapKeyToCameraAction,
    orbit,
} from "./camera-controls";
import { computeZoneStackOrder, type StackedZone } from "./floor-stack";
import { mapZones } from "./map-zones";
import {
    DEFAULT_STATUS_FILTER,
    STATUS_FILTER_OPTIONS,
    isDimmedByStatusFilter,
    type StatusFilterValue,
} from "./status-filter";
import { TASK_STATUS_COLORS, worstZoneStatus } from "./task-status";
import { ZoneStatusLegend } from "./zone-status-legend.component";
import type { Zone } from "./types";

interface ProjectZoneSceneProps {
    projectId: string;
    isDark: boolean;
    selectedLocationId: string | null;
    onSelectZone: (zone: Zone) => void;
    /** Clears the selected floor (wired to the `Esc` keyboard shortcut). */
    onClearSelection?: () => void;
}

/** Floor slab spacing (center-to-center) at rest and when exploded. */
const COLLAPSED_SPACING = 0.9;
const EXPLODED_SPACING = 3.2;
/** Exploded-view tween duration, in seconds. */
const EXPLODE_DURATION = 0.6;
/** World-space Y of the lowest slab's center (just above the ground plane). */
const BASE_Y = 0.6;

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Ref to the drei OrbitControls impl, mutated per-frame to re-center the pivot. */
type OrbitControlsRef = ComponentRef<typeof OrbitControls>;

interface FloorStackProps {
    stacked: StackedZone<Zone>[];
    exploded: boolean;
    selectedLocationId: string | null;
    statusFilter: StatusFilterValue;
    onSelectZone: (zone: Zone) => void;
    onHoverZone: (zone: Zone | null) => void;
    orbitRef: RefObject<OrbitControlsRef | null>;
    /** Shared explode tween, lifted to the scene so `Reset view` can read the LIVE spacing. */
    animRef: RefObject<ExplodeAnim>;
}

/**
 * Renders the ordered slabs stacked on a shared footprint and animates the
 * gap between them (0.9 -> 3.2 over 600ms, ease-in-out) when toggled. The
 * tween runs off React via slab-group refs to avoid per-frame re-renders.
 */
function FloorStack({ stacked, exploded, selectedLocationId, statusFilter, onSelectZone, onHoverZone, orbitRef, animRef }: FloorStackProps) {
    const groupRefs = useRef<(Group | null)[]>([]);

    useEffect(() => {
        const target = exploded ? EXPLODED_SPACING : COLLAPSED_SPACING;
        animRef.current = { from: animRef.current.current, to: target, start: -1, current: animRef.current.current };
    }, [exploded, animRef]);

    useFrame(({ clock }) => {
        const a = animRef.current;
        if (a.current === a.to && a.start !== -1) return; // settled
        if (a.start === -1) a.start = clock.getElapsedTime();
        const t = Math.min(1, (clock.getElapsedTime() - a.start) / EXPLODE_DURATION);
        a.current = a.from + (a.to - a.from) * easeInOutCubic(t);
        if (t >= 1) a.current = a.to;
        for (let i = 0; i < stacked.length; i++) {
            const g = groupRefs.current[i];
            if (g) g.position.y = BASE_Y + stacked[i].level * a.current;
        }
        // Re-center the orbit pivot on the CURRENT stack extent while animating so
        // the building stays framed as it explodes/collapses. Left untouched once
        // settled, so the user's screen-space panning is preserved.
        if (orbitRef.current) {
            orbitRef.current.target.y = BASE_Y + ((stacked.length - 1) * a.current) / 2;
        }
    });

    return (
        <>
            {stacked.map((s, i) => {
                const status = worstZoneStatus({
                    delayed: s.zone.delayed,
                    atRisk: s.zone.atRisk,
                    onTrack: s.zone.onTrack,
                    complete: s.zone.complete,
                });
                const isSelected = selectedLocationId === s.zone.locationId;
                // Dim this floor when a DIFFERENT floor is selected, OR when it
                // doesn't match an active status filter (Phase 6, Q2: dim, never
                // hide). The selected floor is never dimmed by either reason.
                const dimmed =
                    !isSelected && (selectedLocationId !== null || isDimmedByStatusFilter(status, statusFilter));
                return (
                    <group
                        key={s.zone.locationId}
                        ref={(el) => {
                            groupRefs.current[i] = el;
                        }}
                        position={[0, BASE_Y + s.level * COLLAPSED_SPACING, 0]}
                    >
                        <BuildingFloorSlab
                            position={[0, 0, 0]}
                            zoneName={s.zone.zoneName}
                            status={status}
                            selected={isSelected}
                            dimmed={dimmed}
                            onSelect={() => onSelectZone(s.zone)}
                            onHoverChange={(hovered) => onHoverZone(hovered ? s.zone : null)}
                        />
                    </group>
                );
            })}

            <BuildingStructure anim={animRef} levelCount={stacked.length} baseY={BASE_Y} />
        </>
    );
}

/** Fixed-corner hover card: floor name, worst status, per-status breakdown, total. */
function HoverTooltipCard({ zone }: { zone: Zone }) {
    const status = worstZoneStatus({
        delayed: zone.delayed,
        atRisk: zone.atRisk,
        onTrack: zone.onTrack,
        complete: zone.complete,
    });
    const rows: { label: string; value: number; color: string }[] = [
        { label: "Delayed", value: zone.delayed, color: TASK_STATUS_COLORS.Delayed },
        { label: "At Risk", value: zone.atRisk, color: TASK_STATUS_COLORS["At Risk"] },
        { label: "On Track", value: zone.onTrack, color: TASK_STATUS_COLORS["On Track"] },
        { label: "Complete", value: zone.complete, color: TASK_STATUS_COLORS.Complete },
    ];

    return (
        <div className="rounded-lg border border-border bg-popover/95 px-s py-xs shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-s">
                <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground">
                    {zone.zoneName}
                </span>
                <span className="text-100 leading-200 text-muted-foreground">{status ?? "No tasks"}</span>
            </div>
            <div className="mt-xxs flex flex-col gap-xxs">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-s">
                        <span className="inline-flex items-center gap-xs text-100 leading-200 text-muted-foreground">
                            <span aria-hidden className="inline-block h-xs w-xs rounded-full" style={{ backgroundColor: r.color }} />
                            {r.label}
                        </span>
                        <span className="font-numeric tabular-nums text-100 leading-200 text-foreground">{r.value}</span>
                    </div>
                ))}
                <div className="mt-xxs flex items-center justify-between gap-s border-t border-border pt-xxs">
                    <span className="text-100 leading-200 text-muted-foreground">Total</span>
                    <span className="font-numeric tabular-nums text-100 leading-200 text-foreground">{zone.totalTasks}</span>
                </div>
            </div>
        </div>
    );
}

/**
 * The marquee 3D scene: a construction digital twin. Project zones become
 * thin horizontal floor slabs stacked into a building silhouette (Basement at
 * the bottom via zone_name parsing), framed by four corner columns and a roof
 * cap above a ground plane. Slabs are colored worst-status-wins, support an
 * exploded view, OrbitControls, a fixed-corner hover tooltip, and
 * click-to-select (which filters the task table). Also supports a
 * `Reset view` control, keyboard camera shortcuts, a status legend, and an
 * optional 3D-only status filter (docs/zoom-enhancement.md Phases 1, 2, 5, 6).
 */
export function ProjectZoneScene({ projectId, isDark, selectedLocationId, onSelectZone, onClearSelection }: ProjectZoneSceneProps) {
    const { connection, query, columnMetadata } = projectDetailZones(projectId);
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });
    const [exploded, setExploded] = useState(false);
    const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(DEFAULT_STATUS_FILTER);
    const orbitRef = useRef<OrbitControlsRef>(null);
    // Lifted above FloorStack so `Reset view` can read the LIVE (possibly
    // mid-explode) spacing rather than only the collapsed default.
    const animRef = useRef<ExplodeAnim>({ from: COLLAPSED_SPACING, to: COLLAPSED_SPACING, start: -1, current: COLLAPSED_SPACING });

    const zones = useMemo<Zone[]>(() => {
        if (data?.status !== "success") return [];
        return mapZones(data.table, columnMetadata);
    }, [data, columnMetadata]);

    // Bottom -> top ordering by zone_name (Basement lowest, unknowns on top).
    const stacked = useMemo(() => computeZoneStackOrder(zones), [zones]);

    // Initial orbit pivot = middle of the collapsed (at-rest) stack. While the
    // exploded view animates, FloorStack re-centers the pivot on the live extent.
    const centerY = useMemo(() => {
        const [, y] = computeStackCenter(BASE_Y, stacked.length, COLLAPSED_SPACING);
        return y;
    }, [stacked.length]);

    /**
     * Restores the default camera position and re-centers the orbit target on
     * the CURRENT (collapsed or exploded) stack center — camera-only; the
     * selected floor and status filter are left untouched (Q4).
     */
    const handleReset = useCallback(() => {
        const controls = orbitRef.current;
        if (!controls) return;
        const target = computeStackCenter(BASE_Y, stacked.length, animRef.current.current);
        controls.object.position.set(...DEFAULT_CAMERA_POSITION);
        controls.target.set(...target);
        controls.update();
    }, [stacked.length]);

    // Scoped to the focused viewer container (Phase 2): arrow keys orbit/tilt,
    // +/- zoom (clamped to OrbitControls' min/max distance), R resets the
    // camera, Esc clears the selected floor, and E toggles explode/collapse.
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            const action = mapKeyToCameraAction(e.key);
            if (!action) return;
            const controls = orbitRef.current;

            switch (action) {
                case "reset":
                    e.preventDefault();
                    handleReset();
                    return;
                case "clear-selection":
                    e.preventDefault();
                    onClearSelection?.();
                    return;
                case "toggle-explode":
                    e.preventDefault();
                    setExploded((v) => !v);
                    return;
                default:
                    break;
            }

            if (!controls) return;
            const camera = controls.object;
            const position: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
            const target: [number, number, number] = [controls.target.x, controls.target.y, controls.target.z];

            switch (action) {
                case "rotate-left":
                    e.preventDefault();
                    camera.position.set(...orbit(position, target, -ORBIT_STEP_RADIANS, 0, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE));
                    break;
                case "rotate-right":
                    e.preventDefault();
                    camera.position.set(...orbit(position, target, ORBIT_STEP_RADIANS, 0, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE));
                    break;
                case "tilt-up":
                    e.preventDefault();
                    camera.position.set(...orbit(position, target, 0, -ORBIT_STEP_RADIANS, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE));
                    break;
                case "tilt-down":
                    e.preventDefault();
                    camera.position.set(...orbit(position, target, 0, ORBIT_STEP_RADIANS, MIN_POLAR_ANGLE, MAX_POLAR_ANGLE));
                    break;
                case "zoom-in":
                    e.preventDefault();
                    camera.position.set(...dolly(position, target, ZOOM_STEP_FACTOR, MIN_DISTANCE, MAX_DISTANCE));
                    break;
                case "zoom-out":
                    e.preventDefault();
                    camera.position.set(...dolly(position, target, 1 / ZOOM_STEP_FACTOR, MIN_DISTANCE, MAX_DISTANCE));
                    break;
                default:
                    break;
            }
            controls.update();
        },
        [handleReset, onClearSelection],
    );

    if (isLoading) return <PanelSkeleton />;
    if (error || data?.status === "error") {
        return (
            <PanelError message={error?.message ?? (data?.status === "error" ? data.error.message : "Failed to load zones.")} />
        );
    }
    if (data?.status !== "success") return null;
    if (zones.length === 0) return <PanelEmpty message="No zones mapped for this project." />;

    const background = isDark ? "#141310" : "#eae8e3";
    const cellColor = isDark ? "#3a3833" : "#cfcbc3";
    const sectionColor = isDark ? "#5c574f" : "#b1aaa0";
    const groundColor = isDark ? "#1b1a17" : "#e2dfd8";
    // Hemisphere light: cool "sky" from above, warmer bounce from the ground,
    // giving the slabs a soft architectural gradient instead of flat fill.
    const hemiSky = isDark ? "#3a3f4a" : "#dfe4ec";
    const hemiGround = isDark ? "#0f0e0c" : "#b8b2a6";

    return (
        // tabIndex + onKeyDown scope all keyboard camera shortcuts (Phase 2) to
        // this container: they only fire once the viewer has focus, so they never
        // steal arrow-key/Esc handling from the rest of the page.
        <div
            className="relative h-full w-full outline-none"
            tabIndex={0}
            role="application"
            aria-label="3D building viewer. Focus and use arrow keys to rotate, +/- to zoom, R to reset, Esc to clear selection, E to explode."
            onKeyDown={handleKeyDown}
        >
            <div className="absolute right-m top-m z-10 flex items-center gap-xs">
                <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-xs rounded-xl border border-border bg-card/90 px-m py-xs font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <RotateCcw className="icon-size-100" aria-hidden />
                    Reset view
                </button>
                <button
                    type="button"
                    onClick={() => setExploded((v) => !v)}
                    aria-pressed={exploded}
                    className="inline-flex items-center gap-xs rounded-xl border border-border bg-card/90 px-m py-xs font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Layers className="icon-size-100" aria-hidden />
                    {exploded ? "Collapse" : "Explode"}
                </button>
            </div>

            <div className="absolute left-m top-m z-10 flex flex-col gap-xs">
                <label className="pointer-events-auto flex items-center gap-xs rounded-lg border border-border bg-card/90 px-s py-xs shadow-sm backdrop-blur">
                    <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground">
                        Status
                    </span>
                    <select
                        aria-label="Filter 3D view by status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
                        className="rounded-md border border-border bg-transparent text-100 leading-200 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
                <ZoneStatusLegend />
            </div>

            <Canvas camera={{ position: DEFAULT_CAMERA_POSITION, fov: 45 }} className="rounded-xl">
                <color attach="background" args={[background]} />
                <ambientLight intensity={0.4} />
                <hemisphereLight args={[hemiSky, hemiGround, 0.6]} />
                <directionalLight position={[24, 40, 20]} intensity={1.15} />
                <directionalLight position={[-30, 24, -16]} intensity={0.4} />

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <planeGeometry args={[240, 240]} />
                    <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0} />
                </mesh>

                <Grid
                    position={[0, 0.02, 0]}
                    args={[240, 240]}
                    cellSize={8}
                    cellThickness={0.6}
                    cellColor={cellColor}
                    sectionSize={40}
                    sectionThickness={1}
                    sectionColor={sectionColor}
                    infiniteGrid
                    fadeDistance={260}
                    fadeStrength={1.5}
                />

                <FloorStack
                    stacked={stacked}
                    exploded={exploded}
                    selectedLocationId={selectedLocationId}
                    statusFilter={statusFilter}
                    onSelectZone={onSelectZone}
                    onHoverZone={setHoveredZone}
                    orbitRef={orbitRef}
                    animRef={animRef}
                />

                <OrbitControls
                    ref={orbitRef}
                    target={[0, centerY, 0]}
                    enablePan
                    enableZoom
                    enableRotate
                    screenSpacePanning
                    minPolarAngle={MIN_POLAR_ANGLE}
                    maxPolarAngle={MAX_POLAR_ANGLE}
                    minDistance={MIN_DISTANCE}
                    maxDistance={MAX_DISTANCE}
                    enableDamping
                    makeDefault
                />
            </Canvas>

            {hoveredZone ? (
                <div className="pointer-events-none absolute bottom-m right-m z-10 max-w-[200px]">
                    <HoverTooltipCard zone={hoveredZone} />
                </div>
            ) : null}

            <CameraHelpHint />
        </div>
    );
}
