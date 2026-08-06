//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { Html } from "@react-three/drei";

/** Fixed cube dimensions in scene units: [width(x), height(y), depth(z)]. */
const SIZE: [number, number, number] = [8, 3.5, 8];

interface ZoneBoxProps {
    position: [number, number, number];
    color: string;
    zoneName: string;
    selected: boolean;
    onSelect: () => void;
}

/**
 * A single zone rendered as an interactive 3D box. Hover raises a label
 * tooltip and brightens the box; click selects it (persistent highlight).
 */
export function ZoneBox({ position, color, zoneName, selected, onSelect }: ZoneBoxProps) {
    const [hovered, setHovered] = useState(false);
    const active = hovered || selected;

    return (
        <group position={position}>
            <mesh
                scale={active ? 1.06 : 1}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                    setHovered(false);
                    document.body.style.cursor = "";
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
            >
                <boxGeometry args={SIZE} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={active ? 0.55 : 0.12}
                    metalness={0.15}
                    roughness={0.6}
                />
            </mesh>

            {selected ? (
                <mesh scale={1.1}>
                    <boxGeometry args={SIZE} />
                    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
                </mesh>
            ) : null}

            {hovered ? (
                <Html center position={[0, SIZE[1] / 2 + 2.5, 0]} distanceFactor={70} style={{ pointerEvents: "none" }}>
                    <div className="whitespace-nowrap rounded-md border border-border bg-popover px-s py-xxs font-base text-200 leading-200 text-popover-foreground shadow-lg">
                        {zoneName}
                    </div>
                </Html>
            ) : null}
        </group>
    );
}
