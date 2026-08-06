# Zoom and 3D Viewer Enhancement Specification

## Context

This specification evaluates whether the interaction patterns in `docs/zoom-3d-commented.html` should be applied to the existing Jobsite Twin 3D building viewer.

The Jobsite Twin viewer currently lives primarily in:

- `apps/Jobsite_Twin/src/components/project-detail/project-zone-scene.component.tsx`
- `apps/Jobsite_Twin/src/components/project-detail/building-floor-slab.component.tsx`
- `apps/Jobsite_Twin/src/components/project-detail/building-structure.component.tsx`
- `apps/Jobsite_Twin/src/components/project-detail/floor-stack.ts`
- `apps/Jobsite_Twin/src/components/project-detail/single-project-detail.component.tsx`

The reference file, `docs/zoom-3d-commented.html`, demonstrates a dependency-free 3D bar chart rendered on a 2D canvas. Its most relevant concepts are interactive tilt, zoom, reset, filtering, selection focus, visible instructions, and status/legend overlays.

## Recommendation Summary

Some UX and interaction features from `zoom-3d-commented.html` are good candidates for the Jobsite Twin viewer. The custom 2D canvas rendering engine should not be ported because Jobsite Twin already uses `react-three-fiber`, Three.js, WebGL rendering, lighting, materials, raycasting, and `OrbitControls`.

Recommended enhancements:

1. Add a reset view button.
2. Add keyboard camera controls for tilt and zoom.
3. Make camera/viewer instructions more visible.
4. Add selection dimming for non-selected floors.
5. Add a status legend overlay.
6. Consider a floor/status filter control.

Not recommended:

1. Do not port the custom 2D canvas projection engine.
2. Do not port the painter's algorithm or manual polygon hit testing.
3. Do not replace the existing Three.js rendering path.

## Recommended Enhancements

### 1. Reset View Button

Add a visible reset control to restore the default camera position, zoom distance, and orbit target.

Why:

- The reference viewer makes reset discoverable and useful after rotation, zoom, or filtering.
- The current Jobsite Twin viewer already uses `OrbitControls`, so reset can be implemented by restoring the camera and target rather than rebuilding the scene.
- This gives users a reliable way to recover from awkward camera positions.

Likely implementation area:

- `project-zone-scene.component.tsx`

### 2. Keyboard Tilt and Zoom Controls

Add keyboard controls for the 3D viewer, such as:

- Arrow keys to rotate/tilt the view.
- `+` / `=` to zoom in.
- `-` / `_` to zoom out.
- Possibly `0` or `R` to reset the view, pending product decision.

Why:

- The reference viewer supports keyboard interaction.
- This improves accessibility and keyboard-only usability.
- It complements the existing mouse/touch `OrbitControls` behavior.

Likely implementation area:

- `project-zone-scene.component.tsx`
- Potentially a small helper or hook if the behavior should be unit tested.

Open decision:

- Confirm the exact keyboard shortcuts before implementation.

### 3. More Visible Viewer Instructions

Replace or supplement the existing bottom-left `?` help hint with a more visible instruction strip or compact overlay.

Suggested instruction content:

- Rotate: left-click drag
- Pan: right-click drag
- Zoom: scroll or `+/-`
- Select: click floor or task
- Reset: reset view button
- Explode: explode/collapse button

Why:

- The current viewer has help behind a `?` affordance, which is compact but easy to miss.
- The reference viewer exposes core interactions directly.
- A compact instruction row would reduce discoverability issues for first-time users.

Likely implementation area:

- `project-zone-scene.component.tsx`

Open decision:

- Confirm whether the help should be always visible, collapsible, or remain behind the existing `?` button.

### 4. Selection Dimming

When a floor is selected, visually dim non-selected floors while keeping the selected floor prominent.

Why:

- The reference viewer dims non-selected bars when one item is focused.
- Jobsite Twin already shows selected floors with a white wireframe, but dimming other floors would make the selected zone easier to perceive.
- This would strengthen the relationship between 3D floor selection and the filtered task table.

Likely implementation area:

- `building-floor-slab.component.tsx`
- `project-zone-scene.component.tsx`, to pass whether some other floor is selected

Open decision:

- Confirm whether dimming should affect only slab opacity/emissive intensity, or also labels and building structure.

### 5. Status Legend Overlay

Add a compact legend explaining the slab colors:

- Delayed
- At Risk
- On Track
- Complete
- No tasks, if applicable

Why:

- The reference viewer includes a legend explaining its color scale.
- Jobsite Twin colors floors by worst task status, but that mapping is not currently obvious inside the viewer itself.
- A legend would make the visualization self-explanatory.

Likely implementation area:

- `project-zone-scene.component.tsx`
- Possibly a new small component such as `zone-status-legend.component.tsx`

### 6. Optional Floor/Status Filter Control

Add a 3D-view filter, for example:

- Show all floors
- Delayed only
- At Risk only
- On Track only
- Complete only
- No tasks, if needed

Why:

- The reference viewer filters visible records through a dropdown.
- Jobsite Twin already supports selecting a floor and filtering tasks, but a status filter would support a different analysis task: quickly finding floors with schedule or risk issues.

Recommended behavior:

- Prefer dimming non-matching floors over hiding them, unless the desired product behavior is explicitly to remove floors from the 3D stack.
- Dimming preserves building context and avoids making the physical stack look structurally inconsistent.

Likely implementation area:

- `project-zone-scene.component.tsx`
- `building-floor-slab.component.tsx`

Open decision:

- Confirm whether filtering should dim non-matching floors or hide them.

## Enhancements Not Recommended

### 1. Do Not Port the 2D Canvas Rendering Engine

The reference file manually projects 3D points to 2D using functions such as `rotatePoint()` and `project()`, then draws polygons on a 2D canvas.

This should not be ported.

Why:

- Jobsite Twin already uses `react-three-fiber` and Three.js.
- Three.js already handles camera projection, perspective, depth, lighting, materials, and rendering.
- Replacing the current renderer would increase complexity and reduce maintainability.
- The current viewer benefits from built-in raycasting and `OrbitControls`.

### 2. Do Not Port the Painter's Algorithm

The reference sorts cuboid faces back-to-front to fake 3D occlusion on a 2D canvas.

This should not be ported.

Why:

- WebGL and Three.js already provide depth buffering.
- Manual depth sorting would be redundant and could introduce rendering bugs.

### 3. Do Not Port Manual Polygon Hit Testing

The reference rebuilds 2D hit areas every render and tests pointer location against projected polygons.

This should not be ported.

Why:

- The Jobsite Twin viewer already uses Three.js mesh pointer events.
- `building-floor-slab.component.tsx` already handles hover, cursor changes, and click selection through mesh events.
- Manual hit testing would duplicate existing functionality.

## Implementation Plan

This plan describes how to implement the recommended enhancements while preserving the current Three.js rendering architecture.

### Phase 1: Add Reset View

1. In `project-zone-scene.component.tsx`, define default camera position and default target constants.
2. Keep a ref to the underlying camera, or use the `Canvas` camera through react-three-fiber context in a small child component.
3. Add a `Reset view` button near the existing `Explode` button or as part of a compact controls overlay.
4. On reset:
   - Restore camera position to the default position.
   - Restore `OrbitControls.target` to the current stack center.
   - Call `orbitRef.current.update()`.
   - Optionally clear pan/zoom drift, but do not clear selected floor unless explicitly requested.

Acceptance criteria:

- User can rotate, pan, or zoom the building, then press reset and return to the default framing.
- Reset respects the current collapsed/exploded stack center.
- Reset does not change selected floor unless that behavior is explicitly approved.

### Phase 2: Add Keyboard Camera Controls

1. Make the 3D viewer container focusable with an appropriate `tabIndex` and accessible label.
2. Add a keydown handler scoped to the viewer.
3. Map arrow keys to small orbit rotations through `OrbitControls` or camera movement.
4. Map `+` / `=` and `-` / `_` to zoom in/out within the existing `minDistance` and `maxDistance` bounds.
5. Update the help/instruction copy to include keyboard controls.

Acceptance criteria:

- Keyboard users can rotate and zoom the viewer after focusing it.
- Keyboard controls do not interfere with page-level navigation when the viewer is not focused.
- Zoom remains clamped to the configured min/max distance.

Open question:

- Which reset shortcut, if any, should be supported?

### Phase 3: Improve Instruction Visibility

1. Convert the current `CameraHelpHint` into either:
   - a compact always-visible instruction strip, or
   - an expanded default-open help overlay, or
   - the existing `?` affordance plus a more visible label.
2. Include mouse, keyboard, selection, reset, and explode instructions.
3. Ensure the overlay does not block pointer interaction with the 3D canvas except where controls are intentionally clickable.
4. Preserve responsive behavior for smaller screens.

Acceptance criteria:

- First-time users can discover rotate, pan, zoom, select, explode, and reset without reading external documentation.
- The instruction UI does not obscure the building or prevent floor selection.

Open question:

- Should instructions be always visible or collapsible?

### Phase 4: Add Selection Dimming

1. Update `BuildingFloorSlab` props to include whether another floor is selected.
2. When another floor is selected, reduce opacity/emissive intensity for non-selected slabs.
3. Keep the selected slab's existing white wireframe highlight.
4. Ensure delayed/at-risk outlines remain legible.
5. Verify hover still brightens the hovered floor appropriately.

Acceptance criteria:

- Selecting a floor makes it visually dominant.
- Non-selected floors remain visible enough to preserve building context.
- Hover and status styling still work.

Open question:

- Should labels for dimmed floors also dim?

### Phase 5: Add Status Legend

1. Create a small legend overlay listing each task status and its color.
2. Reuse `TASK_STATUS_COLORS` and `NO_TASKS_COLOR` so the legend cannot drift from slab colors.
3. Place the legend where it does not conflict with the explode/reset controls, hover tooltip, or help/instructions.
4. Ensure the legend works in both light and dark themes.

Acceptance criteria:

- Users can understand slab colors without external documentation.
- Legend colors match the actual floor material colors.
- Legend remains readable in both themes.

### Phase 6: Optional Status Filter

1. Add a status filter control with a default of `All`.
2. Compute each zone's worst status using the existing `worstZoneStatus` helper.
3. Apply the filter to the 3D slabs.
4. Prefer dimming non-matching floors unless the desired behavior is explicitly to hide them.
5. Keep task-table selection behavior unchanged unless a separate product decision says otherwise.

Acceptance criteria:

- Users can focus the 3D view by status.
- The building remains understandable after filtering.
- Existing floor click selection and task filtering continue to work.

Open question:

- Should the status filter affect only the 3D scene, or should it also filter the task table?

## Questions Before Implementation

Before implementing code changes, these decisions should be confirmed:

1. Should the instruction UI be always visible, collapsible, or remain behind the existing `?` button?
2. Should status filtering dim non-matching floors or hide them?
3. Should status filtering affect only the 3D building, or also the task table?
4. Should reset view also clear selected floor and status filter, or only reset the camera?
5. Which keyboard shortcuts should be officially supported?
6. Should dimmed floors also dim their labels?

## Scope Guard

This specification intentionally does not require changes to the rendering engine. The Jobsite Twin viewer should continue using `react-three-fiber`, Three.js, WebGL rendering, `OrbitControls`, Three.js raycasting, and the existing floor-slab component architecture.

## Answers to Questions Before Implementation

### Q1 — Instruction UI visibility

**Decision:** Collapsible, default open on first visit, remembers user's collapsed state via localStorage.

**Rationale:** Always-visible competes with the Zone Task Panel on smaller screens. Behind-`?` has known discoverability issues (the reason this spec exists). Collapsible + first-visit-open + persisted state gives new users the discovery win and respects returning users. Smallest diff to existing `CameraHelpHint`.

### Q2 — Status filter: dim vs hide

**Decision:** Dim, not hide. Non-negotiable.

**Rationale:** Hiding a floor from a semantically stacked building breaks the physical model. The Task 7.1.2 stack ordering (Basement -1, Exterior -0.5, Floor 1–3, Mechanical Room 50, Roof 100) exists precisely because the visual stack carries meaning. Suggested dim treatment: opacity 0.15, emissiveIntensity 0, no wireframe. Preserves context and matches the reference implementation pattern.

### Q3 — Status filter scope: 3D only or also task table

**Decision:** 3D scene only. Task table stays independent, driven by floor click selection.

**Rationale:** Floor click already drives the task table via bidirectional selection (Task 7.1.2). Adding a second filter path creates conflict cases (e.g. Floor 2 selected + "Delayed only" filter but Floor 2 has no delayed tasks). Keep the mental model clean: 3D filter answers "where are the problems?", table filter answers "what tasks are on this floor?". Precedent: Portfolio Overview `?status=` filters view, not underlying task lists.

### Q4 — Reset view scope

**Decision:** Camera-only reset. Do not clear selected floor or status filter.

**Rationale:** Aligns with Phase 1 acceptance criteria ("Reset does not change selected floor unless explicitly approved"). Users who rotate/zoom into a weird angle want to recover the camera without losing analytical context. Explicit clearing is better handled by the existing toggle-to-clear pattern (click selected floor again) and the status filter's "All" option.

### Q5 — Keyboard shortcuts

**Decision:** Arrow keys for orbit/tilt; `+`/`=` for zoom in; `-`/`_` for zoom out; `R` for reset; `Esc` to clear selected floor; `E` to toggle explode/collapse.

**Rationale:** `R` for reset is muscle memory in 3D tools (Blender, Fusion 360, Figma). `Esc` for clear selection is a UI convention users expect and matches toggle-to-clear. `E` for explode mirrors the existing Explode button. All shortcuts scoped to the focused viewer container per Phase 2 spec to avoid page-level collisions.

### Q6 — Dim floors: also dim labels

**Decision:** Yes, dim labels to match the slab dim state. Exception: keep delay-pulse indicators at full opacity.

**Rationale:** Labels are part of floor identity — a bright label on a ghosted slab reads as visual noise. Selected floor's label stays fully bright to match its wireframe highlight. Delay-pulse indicators remain full opacity because they are urgency signals users should still catch at a glance, consistent with Phase 4's "delayed/at-risk outlines remain legible" note.
