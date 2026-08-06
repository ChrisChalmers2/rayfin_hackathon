//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Edges } from "@react-three/drei";

interface BuildingEnvelopeProps {
    /** Outer width (x) of the planned silhouette. */
    width: number;
    /** Outer depth (z) of the planned silhouette. */
    depth: number;
    /** Total height (y) spanning ground to the top slab at rest. */
    height: number;
    /** World-space Y of the silhouette's vertical center. */
    centerY: number;
    isDark: boolean;
}

/**
 * A wireframe box outlining the planned building silhouette. Sized to the
 * stack at rest, so when the slabs explode upward they lift out of the
 * envelope — reinforcing the "as-planned vs. exploded" reading. Uses drei
 * <Edges> for a clean 12-edge outline instead of a triangulated wireframe.
 */
export function BuildingEnvelope({ width, depth, height, centerY, isDark }: BuildingEnvelopeProps) {
    const color = isDark ? "#6f6a62" : "#8a8379";

    return (
        <mesh position={[0, centerY, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Edges color={color} />
        </mesh>
    );
}
