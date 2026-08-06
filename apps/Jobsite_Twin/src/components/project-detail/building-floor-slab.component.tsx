//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
import type { MeshBasicMaterial } from "three";
import { TASK_STATUS_COLORS, NO_TASKS_COLOR } from "./task-status";
import { SLAB_SIZE } from "./floor-stack";
import { computeSlabVisuals } from "./slab-visuals";

/** Delayed pulse timing / opacity envelope. */
const PULSE_PERIOD_SECONDS = 1.4;
const PULSE_MIN = 0.35;
const PULSE_MAX = 0.9;

/** Subtle floor-plate outline color. Theme-independent — it sits on the slab
 * surface, whose status colors do not change between light and dark. */
const EDGE_COLOR = "#d8d3c8";

interface BuildingFloorSlabProps {
    /** Local position within the animated stack group (usually the origin). */
    position: [number, number, number];
    /** Zone display name shown as a persistent label to the left of the slab. */
    zoneName: string;
    /** Worst-status-wins for the zone, or `null` when it has no tasks. */
    status: string | null;
    selected: boolean;
    /** True when a DIFFERENT floor is selected, so this one dims for focus. */
    dimmed?: boolean;
    onSelect: () => void;
    /** Reports hover enter/leave so the scene can render a fixed-corner tooltip. */
    onHoverChange?: (hovered: boolean) => void;
}

/**
 * A single floor rendered as a thin horizontal slab. Coloring is 4-state,
 * worst-status-wins:
 *   - Complete  -> steel-blue with a soft emissive glow
 *   - On Track  -> solid green
 *   - At Risk   -> solid amber + static amber outline
 *   - Delayed   -> semi-transparent red + pulsing red outline
 * Hover brightens the slab and reports up so the scene renders a fixed-corner
 * tooltip; click selects it (persistent white wireframe) which drives the zone
 * task-table filter. A persistent floor-name label floats to the slab's left.
 * When another floor is selected, this slab and its label dim to keep the
 * selected floor dominant; the delayed-pulse outline stays bright as an
 * urgency signal (see docs/zoom-enhancement.md Q6).
 */
export function BuildingFloorSlab({ position, zoneName, status, selected, dimmed = false, onSelect, onHoverChange }: BuildingFloorSlabProps) {
    const [hovered, setHovered] = useState(false);
    const pulseRef = useRef<MeshBasicMaterial>(null);

    const isDelayed = status === "Delayed";
    const isAtRisk = status === "At Risk";
    const isComplete = status === "Complete";
    const color = status ? TASK_STATUS_COLORS[status] : NO_TASKS_COLOR;

    // Delayed slabs pulse their red outline; drive it from the render clock.
    // Intentionally independent of `dimmed` — the urgency pulse stays bright.
    useFrame(({ clock }) => {
        if (!isDelayed || !pulseRef.current) return;
        const phase = 0.5 * (1 + Math.sin((clock.getElapsedTime() * 2 * Math.PI) / PULSE_PERIOD_SECONDS));
        pulseRef.current.opacity = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * phase;
    });

    const visuals = computeSlabVisuals({ status, selected, hovered, otherSelected: dimmed });

    return (
        <group position={position}>
            <mesh
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHoverChange?.(true);
                    document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                    setHovered(false);
                    onHoverChange?.(false);
                    document.body.style.cursor = "";
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
            >
                <boxGeometry args={SLAB_SIZE} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={visuals.emissiveIntensity}
                    metalness={isComplete ? 0.35 : 0.15}
                    roughness={isComplete ? 0.35 : 0.6}
                    transparent={visuals.transparent}
                    opacity={visuals.bodyOpacity}
                />
                {/* Thin outline delineates the floor plate for an architectural read. */}
                <Edges threshold={15} color={EDGE_COLOR} transparent opacity={visuals.edgeOpacity} depthWrite={false} />
            </mesh>

            {isAtRisk ? (
                <mesh scale={1.04}>
                    <boxGeometry args={SLAB_SIZE} />
                    <meshBasicMaterial color={TASK_STATUS_COLORS["At Risk"]} wireframe transparent opacity={0.85} />
                </mesh>
            ) : null}

            {isDelayed ? (
                <mesh scale={1.05}>
                    <boxGeometry args={SLAB_SIZE} />
                    <meshBasicMaterial ref={pulseRef} color={TASK_STATUS_COLORS.Delayed} wireframe transparent opacity={PULSE_MAX} />
                </mesh>
            ) : null}

            {selected ? (
                <mesh scale={1.08}>
                    <boxGeometry args={SLAB_SIZE} />
                    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.6} />
                </mesh>
            ) : null}

            {/* Persistent floor label anchored to the LEFT of the slab. Right-aligned
                and translated so its right edge sits at a fixed anchor and the text
                grows leftward, clear of the slab; never intercepts clicks. */}
            <Html
                position={[-SLAB_SIZE[0] / 2 - 3, 0, 0]}
                distanceFactor={60}
                style={{ pointerEvents: "none" }}
            >
                <span
                    className={`block whitespace-nowrap text-right font-heading font-semibold uppercase tracking-wide text-100 leading-200 ${
                        visuals.labelBright ? "text-foreground" : "text-muted-foreground"
                    }`}
                    style={{
                        transform: "translate(-100%, -50%)",
                        opacity: visuals.labelOpacity,
                        transition: "opacity 200ms ease, color 200ms ease",
                    }}
                >
                    {zoneName}
                </span>
            </Html>
        </group>
    );
}
