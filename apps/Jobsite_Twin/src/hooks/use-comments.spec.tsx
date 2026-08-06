//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useComments } from "@/hooks/use-comments";

const mockListByProject = vi.fn();
const mockListByTask = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/comments-client", () => ({
    listByProject: (...args: unknown[]) => mockListByProject(...args),
    listByTask: (...args: unknown[]) => mockListByTask(...args),
    create: (...args: unknown[]) => mockCreate(...args),
}));

const mockUseCurrentUserUpn = vi.fn();
vi.mock("@/hooks/use-current-user-upn", () => ({
    useCurrentUserUpn: () => mockUseCurrentUserUpn(),
}));

function row(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        comment_id: "c-0",
        project_id: "proj-A",
        task_id: null,
        user_upn: "user@contoso.com",
        comment_text: "hello",
        created_datetime: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUserUpn.mockReturnValue("user@contoso.com");
    mockListByProject.mockResolvedValue([]);
    mockListByTask.mockResolvedValue([]);
    mockCreate.mockImplementation(async (input: unknown) => input);
});

describe("useComments", () => {
    it("loads project-level comments on mount", async () => {
        mockListByProject.mockResolvedValue([row()]);

        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockListByProject).toHaveBeenCalledWith("proj-A");
        expect(mockListByTask).not.toHaveBeenCalled();
        expect(result.current.comments).toHaveLength(1);
    });

    it("loads task-level comments when task_id is supplied", async () => {
        mockListByTask.mockResolvedValue([row({ task_id: "task-1" })]);

        const { result } = renderHook(() => useComments({ projectId: "proj-A", taskId: "task-1" }));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockListByTask).toHaveBeenCalledWith("proj-A", "task-1");
        expect(mockListByProject).not.toHaveBeenCalled();
    });

    it("exposes loading state before data resolves", () => {
        mockListByProject.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.comments).toEqual([]);
    });

    it("exposes error state when loading fails", async () => {
        mockListByProject.mockRejectedValue(new Error("load failed"));

        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error?.message).toBe("load failed");
    });

    it("refetches after a successful post", async () => {
        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockListByProject).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.submit("a new comment");
        });

        expect(mockListByProject).toHaveBeenCalledTimes(2);
    });

    it("shows an optimistic comment immediately after submit", async () => {
        // Never-resolving create lets us observe the optimistic state mid-flight.
        mockCreate.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => {
            void result.current.submit("optimistic comment");
        });

        await waitFor(() => expect(result.current.comments).toHaveLength(1));
        expect(result.current.comments[0].comment_text).toBe("optimistic comment");
        expect(result.current.comments[0].user_upn).toBe("user@contoso.com");
    });

    it("keeps the optimistic comment after successful create/refetch", async () => {
        mockListByProject.mockResolvedValueOnce([]);
        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // The refetch after a successful create returns the persisted row.
        mockListByProject.mockResolvedValueOnce([row({ comment_id: "server-id", comment_text: "kept comment" })]);

        await act(async () => {
            await result.current.submit("kept comment");
        });

        expect(result.current.comments.some((c) => c.comment_text === "kept comment")).toBe(true);
        expect(result.current.submitError).toBeNull();
    });

    it("rolls back the optimistic comment when create fails", async () => {
        mockCreate.mockRejectedValue(new Error("policy rejected insert"));
        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await expect(result.current.submit("will fail")).rejects.toThrow("policy rejected insert");
        });

        expect(result.current.comments.some((c) => c.comment_text === "will fail")).toBe(false);
        expect(result.current.submitError?.message).toBe("policy rejected insert");
    });

    it("does not submit when text is invalid", async () => {
        const { result } = renderHook(() => useComments({ projectId: "proj-A" }));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.submit("   ");
        });

        expect(mockCreate).not.toHaveBeenCalled();
        expect(result.current.comments).toHaveLength(0);
    });
});
