//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CameraHelpHint } from "./camera-help-hint.component";

describe("CameraHelpHint", () => {
    it("is open by default", () => {
        render(<CameraHelpHint />);
        expect(screen.getByRole("region", { name: "3D viewer controls" })).toBeInTheDocument();
    });

    it("includes mouse, keyboard, selection, reset, and explode instructions", () => {
        render(<CameraHelpHint />);
        expect(screen.getByText("Left-click drag")).toBeInTheDocument();
        expect(screen.getByText("Right-click drag")).toBeInTheDocument();
        expect(screen.getByText("Scroll or +/-")).toBeInTheDocument();
        expect(screen.getByText("Arrow keys")).toBeInTheDocument();
        expect(screen.getByText("Esc")).toBeInTheDocument();
        expect(screen.getByText("Reset view button or R")).toBeInTheDocument();
        expect(screen.getByText("Explode button or E")).toBeInTheDocument();
    });

    it("collapses on click", () => {
        render(<CameraHelpHint />);
        fireEvent.click(screen.getByRole("button", { name: "Hide 3D viewer controls" }));
        expect(screen.queryByRole("region", { name: "3D viewer controls" })).not.toBeInTheDocument();
    });

    it("re-expands when reopened", () => {
        render(<CameraHelpHint />);
        fireEvent.click(screen.getByRole("button", { name: "Hide 3D viewer controls" }));
        fireEvent.click(screen.getByRole("button", { name: "Show 3D viewer controls" }));
        expect(screen.getByRole("region", { name: "3D viewer controls" })).toBeInTheDocument();
    });
});
