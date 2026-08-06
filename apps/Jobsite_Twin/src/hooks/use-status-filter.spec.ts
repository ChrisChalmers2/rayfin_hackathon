//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { beforeEach, describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStatusFilter, parseStatusParam, PROJECT_STATUSES } from "./use-status-filter";

function setRoute(route: string) {
    window.history.replaceState(null, "", `#${route}`);
    window.dispatchEvent(new Event("hashchange"));
}

describe("parseStatusParam", () => {
    it("returns the value for each known status", () => {
        for (const s of PROJECT_STATUSES) expect(parseStatusParam(s)).toBe(s);
    });

    it("returns null for missing, empty, or unknown values", () => {
        expect(parseStatusParam(null)).toBeNull();
        expect(parseStatusParam(undefined)).toBeNull();
        expect(parseStatusParam("")).toBeNull();
        expect(parseStatusParam("delayed")).toBeNull(); // case-sensitive
        expect(parseStatusParam("Cancelled")).toBeNull();
    });
});

describe("useStatusFilter", () => {
    beforeEach(() => {
        setRoute("/");
    });

    it("reads the active status from the URL", () => {
        setRoute("/?status=Delayed");
        const { result } = renderHook(() => useStatusFilter());
        expect(result.current.status).toBe("Delayed");
    });

    it("ignores an unknown status in the URL", () => {
        setRoute("/?status=bogus");
        const { result } = renderHook(() => useStatusFilter());
        expect(result.current.status).toBeNull();
    });

    it("setStatus sets then clears the filter", () => {
        const { result } = renderHook(() => useStatusFilter());
        act(() => result.current.setStatus("At Risk"));
        expect(result.current.status).toBe("At Risk");
        act(() => result.current.setStatus(null));
        expect(result.current.status).toBeNull();
    });

    it("toggleStatus clears when the same status is active, switches otherwise", () => {
        setRoute("/?status=Delayed");
        const { result } = renderHook(() => useStatusFilter());
        act(() => result.current.toggleStatus("Delayed"));
        expect(result.current.status).toBeNull();
        act(() => result.current.toggleStatus("On Track"));
        expect(result.current.status).toBe("On Track");
    });

    it("clearStatus removes an active filter", () => {
        setRoute("/?status=At%20Risk");
        const { result } = renderHook(() => useStatusFilter());
        expect(result.current.status).toBe("At Risk");
        act(() => result.current.clearStatus());
        expect(result.current.status).toBeNull();
    });
});
