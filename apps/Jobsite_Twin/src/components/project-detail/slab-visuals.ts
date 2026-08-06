//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure visual-state math for a single building floor slab. Given the slab's
 * worst-status and interaction state (selected / hovered / dimmed because a
 * different floor is selected), it returns the emissive intensity, body
 * opacity, and label treatment the renderer applies. Kept free of Three.js /
 * React so it can be unit-tested in isolation.
 *
 * Dimming contract (see docs/zoom-enhancement.md Q6): when another floor is
 * selected, non-selected floors and their labels dim to keep the selected
 * floor visually dominant while preserving building context. Hovering a dimmed
 * floor brings it back to full presence. The selected floor is never dimmed.
 * The delayed-pulse outline is intentionally NOT governed here — it stays at
 * full opacity as an urgency signal, handled directly by the component.
 */

/** Interaction + status inputs that determine a slab's visual treatment. */
export interface SlabVisualInput {
    /** Worst-status-wins for the zone, or `null` when it has no tasks. */
    status: string | null;
    /** True when this slab is the currently selected one. */
    selected: boolean;
    /** True while the pointer hovers this slab. */
    hovered: boolean;
    /** True when a DIFFERENT floor is selected and this one is not. */
    otherSelected: boolean;
}

/** Resolved visual values for a slab, consumed by the renderer. */
export interface SlabVisuals {
    /** `meshStandardMaterial` emissiveIntensity for the slab body. */
    emissiveIntensity: number;
    /** `meshStandardMaterial` opacity for the slab body. */
    bodyOpacity: number;
    /** Whether the body must render transparent (opacity < 1). */
    transparent: boolean;
    /** Opacity (0..1) for the persistent floor label. */
    labelOpacity: number;
    /** True when the label should use the bright (foreground) color. */
    labelBright: boolean;
    /** Opacity (0..1) for the floor-plate edge outline. */
    edgeOpacity: number;
}

/** Body opacity for a floor dimmed because another floor is selected. */
export const DIM_BODY_OPACITY = 0.22;
/** Emissive intensity for a dimmed floor. */
export const DIM_EMISSIVE_INTENSITY = 0.05;
/** Label opacity for a dimmed floor. */
export const DIM_LABEL_OPACITY = 0.3;
/** Flat emissive intensity for a floor at rest (no selection anywhere). */
export const REST_EMISSIVE_INTENSITY = 0.08;

/**
 * Resolve the visual treatment for a slab from its status and interaction
 * state. See the module doc comment for the dimming contract.
 */
export function computeSlabVisuals({ status, selected, hovered, otherSelected }: SlabVisualInput): SlabVisuals {
    const isDelayed = status === "Delayed";
    const isComplete = status === "Complete";
    const bodyOpacity = isDelayed ? 0.55 : 1;
    const transparent = isDelayed;

    // A floor dims only when a different floor is selected AND this one is
    // neither selected nor hovered (hover always restores full presence).
    const dimmed = otherSelected && !selected && !hovered;
    if (dimmed) {
        return {
            emissiveIntensity: DIM_EMISSIVE_INTENSITY,
            bodyOpacity: DIM_BODY_OPACITY,
            transparent: true,
            labelOpacity: DIM_LABEL_OPACITY,
            labelBright: false,
            edgeOpacity: 0.15,
        };
    }

    // Emphasis is reserved for interaction and steps up in three tiers: at rest
    // every floor is calm and flat; hover clearly lifts it; the clicked
    // (selected) floor is the strongest. This gives click/hover an obvious jump
    // from the resting state so the model never reads as pre-selected.
    if (selected) {
        return {
            emissiveIntensity: isComplete ? 1 : 0.7,
            bodyOpacity,
            transparent,
            labelOpacity: 1,
            labelBright: true,
            edgeOpacity: 0.9,
        };
    }
    if (hovered) {
        return {
            emissiveIntensity: isComplete ? 0.55 : 0.4,
            bodyOpacity,
            transparent,
            labelOpacity: 1,
            labelBright: true,
            edgeOpacity: 0.7,
        };
    }
    return {
        emissiveIntensity: REST_EMISSIVE_INTENSITY,
        bodyOpacity,
        transparent,
        labelOpacity: 1,
        labelBright: false,
        edgeOpacity: 0.4,
    };
}
