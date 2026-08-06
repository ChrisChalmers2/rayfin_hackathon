//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { SLAB_SIZE } from "./floor-stack";
import { COLUMN_WIDTH, ROOF_HEIGHT, columnHeight, columnPositions } from "./building-structure";

/** Exploded-view tween state shared with the floor stack (read-only here). */
export interface ExplodeAnim {
    from: number;
    to: number;
    start: number;
    current: number;
}

/** Steel-gray corner columns. */
const COLUMN_COLOR = "#8a8a8a";
/** Dark charcoal roof cap. */
const ROOF_COLOR = "#2b2b28";

interface BuildingStructureProps {
    /** Shared explode tween ref, advanced each frame by the floor stack. */
    anim: React.RefObject<ExplodeAnim>;
    /** Number of stacked floors. */
    levelCount: number;
    /** World-space Y of the lowest slab's center. */
    baseY: number;
}

/**
 * Exposed structure that makes the stack read as a building: four steel-gray
 * corner columns running ground -> roof (which extend as the stack explodes),
 * and a charcoal roof cap on the top slab. Rendered outside floor-status
 * coloring so the building outline stays clean. Column / roof transforms are
 * driven off the shared explode tween (read-only) each frame, keeping them in
 * lock-step with the animating slabs.
 */
export function BuildingStructure({ anim, levelCount, baseY }: BuildingStructureProps) {
    const columnRefs = useRef<(Mesh | null)[]>([]);
    const roofRef = useRef<Mesh>(null);
    const corners = useMemo(() => columnPositions(SLAB_SIZE[0], SLAB_SIZE[2]), []);

    useFrame(() => {
        const spacing = anim.current?.current ?? 0.9;
        const height = columnHeight(levelCount, spacing, baseY, SLAB_SIZE[1], ROOF_HEIGHT);
        for (let i = 0; i < columnRefs.current.length; i++) {
            const column = columnRefs.current[i];
            if (column) {
                column.scale.y = height;
                column.position.y = height / 2;
            }
        }
        const roof = roofRef.current;
        if (roof) {
            roof.position.y = baseY + Math.max(levelCount - 1, 0) * spacing + SLAB_SIZE[1] / 2 + ROOF_HEIGHT / 2;
        }
    });

    return (
        <>
            {corners.map(([x, z], i) => (
                <mesh
                    key={`${x},${z}`}
                    ref={(el) => {
                        columnRefs.current[i] = el;
                    }}
                    position={[x, 0, z]}
                >
                    <boxGeometry args={[COLUMN_WIDTH, 1, COLUMN_WIDTH]} />
                    <meshStandardMaterial color={COLUMN_COLOR} metalness={0.55} roughness={0.5} />
                </mesh>
            ))}

            <mesh ref={roofRef} position={[0, baseY, 0]}>
                <boxGeometry args={[SLAB_SIZE[0] + 0.4, ROOF_HEIGHT, SLAB_SIZE[2] + 0.4]} />
                <meshStandardMaterial color={ROOF_COLOR} metalness={0.1} roughness={0.85} />
            </mesh>
        </>
    );
}
