//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Grid, Html, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { projectDetailTasks, projectDetailZones } from "@/queries/project-detail";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { PanelSkeleton, PanelError, PanelEmpty } from "../portfolio/panel.component";
import { mapZones } from "./map-zones";
import { toRowObjects, toNumber } from "./row-objects";
import { TASK_STATUS_COLORS, NO_TASKS_COLOR } from "./task-status";
import { SLAB_SIZE } from "./floor-stack";
import { buildConstructionFloors, type ConstructionFloorData } from "./construction-data";
import type { ProjectTask } from "./types";

interface ConstructionTwinSceneProps {
    projectId: string;
    isDark: boolean;
}

/** Floor spacing (center-to-center) and base height for the construction stack. */
const SPACING = 1.9;
const BASE_Y = 0.6;

/** Rebar post footprint (x,z) on each floor — a grid reads as a cage. */
const REBAR: [number, number][] = [];
for (const rx of [-3, -1.5, 0, 1.5, 3]) {
    for (const rz of [-2, 0, 2]) {
        REBAR.push([rx, rz]);
    }
}

/**
 * One floor rendered by its real build fraction: the finished, status-colored
 * slab fades in as `buildFraction` climbs, while the under-construction concrete
 * deck + yellow formwork + rebar posts fade out. A fully complete floor (1.0)
 * is a solid slab; a 0% floor is all rebar/formwork.
 */
function FloorMesh({ floor, showLabels }: { floor: ConstructionFloorData; showLabels: boolean }) {
    const p = floor.buildFraction;
    const statusColor = floor.status ? TASK_STATUS_COLORS[floor.status] : NO_TASKS_COLOR;
    const underConstruction = p < 0.999;
    const y = BASE_Y + floor.level * SPACING;

    return (
        <group position={[0, y, 0]}>
            {/* Finished, status-colored slab (opacity = build fraction). */}
            <mesh>
                <boxGeometry args={SLAB_SIZE} />
                <meshStandardMaterial
                    color={statusColor}
                    transparent
                    opacity={Math.max(p, 0.02)}
                    metalness={0.15}
                    roughness={0.6}
                />
                <Edges threshold={15} color="#d8d3c8" transparent opacity={0.15 + 0.35 * p} />
            </mesh>

            {underConstruction ? (
                <>
                    {/* Concrete deck being poured. */}
                    <mesh>
                        <boxGeometry args={[SLAB_SIZE[0] * 0.98, SLAB_SIZE[1] * 0.85, SLAB_SIZE[2] * 0.98]} />
                        <meshStandardMaterial color="#9a958c" transparent opacity={(1 - p) * 0.92} roughness={0.95} metalness={0} />
                    </mesh>
                    {/* Yellow formwork outline. */}
                    <mesh scale={1.03}>
                        <boxGeometry args={SLAB_SIZE} />
                        <meshBasicMaterial color="#c9a227" wireframe transparent opacity={(1 - p) * 0.5} />
                    </mesh>
                    {/* Rebar posts. */}
                    <group position={[0, SLAB_SIZE[1] / 2, 0]} scale={[1, 0.15 + (1 - p) * 0.85, 1]}>
                        {REBAR.map(([x, z], i) => (
                            <mesh key={i} position={[x, 0.85, z]}>
                                <cylinderGeometry args={[0.04, 0.04, 1.7, 6]} />
                                <meshStandardMaterial color="#8a7f6a" metalness={0.6} roughness={0.5} transparent opacity={1 - p} />
                            </mesh>
                        ))}
                    </group>
                </>
            ) : null}

            {showLabels ? (
                <Html position={[SLAB_SIZE[0] / 2 + 1.5, 0, 0]} distanceFactor={55} style={{ pointerEvents: "none" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                            transform: "translate(0, -50%)",
                            font: "600 12px system-ui, sans-serif",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: underConstruction ? "#e0a94a" : "#f0ede8",
                            textShadow: "0 1px 3px rgba(0,0,0,0.75)",
                        }}
                    >
                        <span style={{ width: 9, height: 9, borderRadius: 9, background: statusColor, boxShadow: "0 0 0 1px rgba(0,0,0,0.4)" }} />
                        {floor.zoneName}
                        <span style={{ opacity: 0.7 }}>{Math.round(p * 100)}%</span>
                    </div>
                </Html>
            ) : null}
        </group>
    );
}

/**
 * Electrical (yellow conduit + junction boxes) and plumbing (blue cold + red hot
 * risers) MEP layers, drawn only through floors that actually have those tasks.
 */
function MepLayers({
    floors,
    showElectrical,
    showPlumbing,
}: {
    floors: ConstructionFloorData[];
    showElectrical: boolean;
    showPlumbing: boolean;
}) {
    const topY = BASE_Y + Math.max(floors.length - 1, 0) * SPACING + SLAB_SIZE[1] / 2;
    const elecFloors = floors.filter((f) => f.hasElectrical);
    const plumbFloors = floors.filter((f) => f.hasPlumbing);

    return (
        <group>
            {showPlumbing && plumbFloors.length > 0 ? (
                <>
                    {([["#2b7fff", -1.7], ["#e0574b", -1.2]] as const).map(([color, z], i) => (
                        <mesh key={`pr${i}`} position={[-2.6, topY / 2, z]}>
                            <cylinderGeometry args={[0.08, 0.08, topY, 12]} />
                            <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
                        </mesh>
                    ))}
                    {plumbFloors.map((f) => (
                        <mesh key={`pb${f.locationId}`} position={[-1.5, BASE_Y + f.level * SPACING, -1.45]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.055, 0.055, 2.2, 8]} />
                            <meshStandardMaterial color="#2b7fff" metalness={0.35} roughness={0.35} />
                        </mesh>
                    ))}
                </>
            ) : null}

            {showElectrical && elecFloors.length > 0 ? (
                <>
                    <mesh position={[2.6, topY / 2, -1.5]}>
                        <cylinderGeometry args={[0.06, 0.06, topY, 8]} />
                        <meshStandardMaterial color="#f2b705" metalness={0.5} roughness={0.4} emissive="#5a4300" emissiveIntensity={0.4} />
                    </mesh>
                    {elecFloors.map((f) => {
                        const y = BASE_Y + f.level * SPACING;
                        return (
                            <group key={`e${f.locationId}`}>
                                <mesh position={[1.35, y + 0.15, -1.5]} rotation={[0, 0, Math.PI / 2]}>
                                    <cylinderGeometry args={[0.04, 0.04, 2.5, 6]} />
                                    <meshStandardMaterial color="#f2b705" metalness={0.5} roughness={0.4} emissive="#5a4300" emissiveIntensity={0.4} />
                                </mesh>
                                <mesh position={[0, y + 0.15, -1.5]}>
                                    <boxGeometry args={[0.42, 0.42, 0.18]} />
                                    <meshStandardMaterial color="#c19700" metalness={0.4} roughness={0.5} />
                                </mesh>
                            </group>
                        );
                    })}
                </>
            ) : null}
        </group>
    );
}

/** A tower crane beside the site: static mast + a slowly rotating jib assembly. */
function TowerCrane({ mastHeight }: { mastHeight: number }) {
    const top = useRef<Group>(null);
    useFrame((_, delta) => {
        if (top.current) top.current.rotation.y += delta * 0.12;
    });
    const crane = "#e0a83a";
    return (
        <group position={[-13, 0, -9]}>
            <mesh position={[0, mastHeight / 2, 0]}>
                <boxGeometry args={[0.5, mastHeight, 0.5]} />
                <meshStandardMaterial color={crane} metalness={0.4} roughness={0.5} />
            </mesh>
            <group ref={top} position={[0, mastHeight, 0]}>
                <mesh position={[6, 0, 0]}>
                    <boxGeometry args={[14, 0.4, 0.4]} />
                    <meshStandardMaterial color={crane} metalness={0.4} roughness={0.5} />
                </mesh>
                <mesh position={[-3, 0, 0]}>
                    <boxGeometry args={[5, 0.4, 0.4]} />
                    <meshStandardMaterial color={crane} metalness={0.4} roughness={0.5} />
                </mesh>
                <mesh position={[-5, -0.35, 0]}>
                    <boxGeometry args={[1.3, 1, 1]} />
                    <meshStandardMaterial color="#3a3a35" metalness={0.3} roughness={0.7} />
                </mesh>
                <mesh position={[0.7, -0.6, 0]}>
                    <boxGeometry args={[0.9, 0.9, 0.9]} />
                    <meshStandardMaterial color="#2b6fbf" metalness={0.3} roughness={0.5} />
                </mesh>
                <mesh position={[10, -2.2, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 4.4, 6]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                <mesh position={[10, -4.4, 0]}>
                    <boxGeometry args={[0.22, 0.45, 0.22]} />
                    <meshStandardMaterial color="#9a9a9a" metalness={0.7} roughness={0.3} />
                </mesh>
            </group>
        </group>
    );
}

/** Small overlay toggle button matching the app's control styling. */
function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-xs rounded-xl border px-m py-xs font-heading font-semibold uppercase tracking-wide text-100 leading-200 shadow-sm backdrop-blur transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/90 text-foreground hover:bg-hover"
            }`}
        >
            {children}
        </button>
    );
}

/**
 * Construction digital-twin view: renders the project's zones as a building that
 * is "built up" by each floor's real task-completion (`buildFraction`), with
 * toggleable electrical / plumbing MEP layers drawn only where those tasks exist,
 * and floor labels showing zone name + % complete. Reads the same live semantic
 * model as the status view — no mock data.
 */
export function ConstructionTwinScene({ projectId, isDark }: ConstructionTwinSceneProps) {
    const zonesQ = projectDetailZones(projectId);
    const zonesResult = useSemanticModelQuery({ connection: zonesQ.connection, query: zonesQ.query });
    const tasksQ = projectDetailTasks(projectId);
    const tasksResult = useSemanticModelQuery({ connection: tasksQ.connection, query: tasksQ.query });

    const [showLabels, setShowLabels] = useState(true);
    const [showElectrical, setShowElectrical] = useState(false);
    const [showPlumbing, setShowPlumbing] = useState(false);

    const floors = useMemo<ConstructionFloorData[]>(() => {
        if (zonesResult.data?.status !== "success") return [];
        const zones = mapZones(zonesResult.data.table, zonesQ.columnMetadata);
        const tasks: ProjectTask[] =
            tasksResult.data?.status === "success"
                ? toRowObjects(toDataTable(tasksResult.data.table, tasksQ.columnMetadata)).map((r) => ({
                      taskId: String(r.TaskId ?? ""),
                      taskName: String(r.TaskName ?? ""),
                      taskStatus: String(r.TaskStatus ?? ""),
                      locationId: String(r.LocationId ?? ""),
                      delayDays: r.DelayDays == null ? null : toNumber(r.DelayDays),
                  }))
                : [];
        return buildConstructionFloors(zones, tasks);
    }, [zonesResult.data, tasksResult.data, zonesQ.columnMetadata, tasksQ.columnMetadata]);

    if (zonesResult.isLoading) return <PanelSkeleton />;
    if (zonesResult.error || zonesResult.data?.status === "error") {
        const message =
            zonesResult.error?.message ??
            (zonesResult.data?.status === "error" ? zonesResult.data.error.message : "Failed to load zones.");
        return <PanelError message={message} />;
    }
    if (floors.length === 0) return <PanelEmpty message="No zones mapped for this project." />;

    const background = isDark ? "#141310" : "#e9e3d6";
    const groundColor = isDark ? "#3a3529" : "#c9bda0";
    const cellColor = isDark ? "#5c5442" : "#b3a988";
    const sectionColor = isDark ? "#7a7059" : "#9c9179";
    const centerY = BASE_Y + (Math.max(floors.length - 1, 0) * SPACING) / 2;
    const mastHeight = BASE_Y + Math.max(floors.length - 1, 0) * SPACING + 6;
    const columnHeight = BASE_Y + Math.max(floors.length - 1, 0) * SPACING + SLAB_SIZE[1];

    return (
        <div className="relative h-full w-full">
            <div className="absolute left-m top-m z-10 flex flex-wrap gap-xs">
                <ToggleButton active={showLabels} onClick={() => setShowLabels((v) => !v)}>
                    Labels
                </ToggleButton>
                <ToggleButton active={showElectrical} onClick={() => setShowElectrical((v) => !v)}>
                    Electrical
                </ToggleButton>
                <ToggleButton active={showPlumbing} onClick={() => setShowPlumbing((v) => !v)}>
                    Plumbing
                </ToggleButton>
            </div>

            <Canvas camera={{ position: [20, 15, 20], fov: 45 }} className="rounded-xl">
                <color attach="background" args={[background]} />
                <ambientLight intensity={0.4} />
                <hemisphereLight args={[isDark ? "#3a3f4a" : "#dfe4ec", isDark ? "#0f0e0c" : "#b8b2a6", 0.6]} />
                <directionalLight position={[24, 40, 20]} intensity={1.15} />
                <directionalLight position={[-30, 24, -16]} intensity={0.4} />

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <planeGeometry args={[240, 240]} />
                    <meshStandardMaterial color={groundColor} roughness={1} metalness={0} />
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

                {([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sz], i) => (
                    <mesh key={i} position={[sx * (SLAB_SIZE[0] / 2), columnHeight / 2, sz * (SLAB_SIZE[2] / 2)]}>
                        <boxGeometry args={[0.35, columnHeight, 0.35]} />
                        <meshStandardMaterial color="#8a8a8a" metalness={0.55} roughness={0.5} />
                    </mesh>
                ))}

                <TowerCrane mastHeight={mastHeight} />

                {floors.map((floor) => (
                    <FloorMesh key={floor.locationId} floor={floor} showLabels={showLabels} />
                ))}

                <MepLayers floors={floors} showElectrical={showElectrical} showPlumbing={showPlumbing} />

                <OrbitControls target={[0, centerY, 0]} enableDamping makeDefault minDistance={8} maxDistance={80} />
            </Canvas>
        </div>
    );
}
