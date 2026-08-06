//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
    computeSlabVisuals,
    DIM_BODY_OPACITY,
    DIM_EMISSIVE_INTENSITY,
    DIM_LABEL_OPACITY,
    REST_EMISSIVE_INTENSITY,
} from "./slab-visuals";

describe("computeSlabVisuals", () => {
    it("renders an idle On Track floor flat and calm with a muted label", () => {
        const v = computeSlabVisuals({ status: "On Track", selected: false, hovered: false, otherSelected: false });
        expect(v.bodyOpacity).toBe(1);
        expect(v.transparent).toBe(false);
        expect(v.emissiveIntensity).toBe(REST_EMISSIVE_INTENSITY);
        expect(v.labelOpacity).toBe(1);
        expect(v.labelBright).toBe(false);
        expect(v.edgeOpacity).toBe(0.4);
    });

    it("steps up rest -> hover -> selected in emphasis and edge opacity", () => {
        const rest = computeSlabVisuals({ status: "On Track", selected: false, hovered: false, otherSelected: false });
        const hover = computeSlabVisuals({ status: "On Track", selected: false, hovered: true, otherSelected: false });
        const selected = computeSlabVisuals({ status: "On Track", selected: true, hovered: false, otherSelected: false });
        // Emissive climbs at each tier.
        expect(hover.emissiveIntensity).toBeGreaterThan(rest.emissiveIntensity);
        expect(selected.emissiveIntensity).toBeGreaterThan(hover.emissiveIntensity);
        // Edge outline brightens at each tier.
        expect(hover.edgeOpacity).toBeGreaterThan(rest.edgeOpacity);
        expect(selected.edgeOpacity).toBeGreaterThan(hover.edgeOpacity);
    });

    it("brightens the label and emissive when selected", () => {
        const v = computeSlabVisuals({ status: "On Track", selected: true, hovered: false, otherSelected: false });
        expect(v.emissiveIntensity).toBe(0.7);
        expect(v.labelBright).toBe(true);
        expect(v.labelOpacity).toBe(1);
        expect(v.edgeOpacity).toBe(0.9);
    });

    it("brightens the label and emissive on hover, but less than selected", () => {
        const v = computeSlabVisuals({ status: "On Track", selected: false, hovered: true, otherSelected: false });
        expect(v.emissiveIntensity).toBe(0.4);
        expect(v.labelBright).toBe(true);
        expect(v.edgeOpacity).toBe(0.7);
    });

    it("dims the body AND label when another floor is selected", () => {
        const v = computeSlabVisuals({ status: "On Track", selected: false, hovered: false, otherSelected: true });
        expect(v.bodyOpacity).toBe(DIM_BODY_OPACITY);
        expect(v.emissiveIntensity).toBe(DIM_EMISSIVE_INTENSITY);
        expect(v.labelOpacity).toBe(DIM_LABEL_OPACITY);
        expect(v.transparent).toBe(true);
        expect(v.labelBright).toBe(false);
        expect(v.edgeOpacity).toBe(0.15);
    });

    it("restores full presence when hovering a floor that would otherwise be dimmed", () => {
        const v = computeSlabVisuals({ status: "On Track", selected: false, hovered: true, otherSelected: true });
        expect(v.bodyOpacity).toBe(1);
        expect(v.labelOpacity).toBe(1);
        expect(v.labelBright).toBe(true);
    });

    it("never dims the selected floor even if otherSelected is true", () => {
        // otherSelected should never be true for the selected floor, but guard anyway.
        const v = computeSlabVisuals({ status: "On Track", selected: true, hovered: false, otherSelected: true });
        expect(v.bodyOpacity).toBe(1);
        expect(v.labelOpacity).toBe(1);
        expect(v.labelBright).toBe(true);
    });

    it("keeps a Delayed floor semi-transparent at rest", () => {
        const v = computeSlabVisuals({ status: "Delayed", selected: false, hovered: false, otherSelected: false });
        expect(v.bodyOpacity).toBe(0.55);
        expect(v.transparent).toBe(true);
    });

    it("keeps a Complete floor calm at rest and strongest when clicked", () => {
        const idle = computeSlabVisuals({ status: "Complete", selected: false, hovered: false, otherSelected: false });
        const selected = computeSlabVisuals({ status: "Complete", selected: true, hovered: false, otherSelected: false });
        expect(idle.emissiveIntensity).toBe(REST_EMISSIVE_INTENSITY);
        expect(selected.emissiveIntensity).toBe(1);
    });

    it("dims a Delayed floor's body when another floor is selected (pulse handled separately)", () => {
        const v = computeSlabVisuals({ status: "Delayed", selected: false, hovered: false, otherSelected: true });
        expect(v.bodyOpacity).toBe(DIM_BODY_OPACITY);
        expect(v.transparent).toBe(true);
    });
});
