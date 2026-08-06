//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectCommentsPanel } from "@/components/project-detail/project-comments-panel.component";

const mockUseComments = vi.fn();
vi.mock("@/hooks/use-comments", () => ({
    useComments: (...args: unknown[]) => mockUseComments(...args),
    MAX_COMMENT_LENGTH: 2000,
}));

function baseHookState(overrides: Record<string, unknown> = {}) {
    return {
        comments: [],
        isLoading: false,
        error: null,
        isSubmitting: false,
        submitError: null,
        submit: vi.fn().mockResolvedValue(undefined),
        refetch: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("ProjectCommentsPanel", () => {
    it("passes the current project_id to useComments with no task_id", () => {
        mockUseComments.mockReturnValue(baseHookState());
        render(<ProjectCommentsPanel projectId="proj-A" />);

        expect(mockUseComments).toHaveBeenCalledWith({ projectId: "proj-A" });
    });

    it("renders thread state from the hook", () => {
        mockUseComments.mockReturnValue(
            baseHookState({
                comments: [
                    {
                        comment_id: "c-1",
                        project_id: "proj-A",
                        task_id: null,
                        user_upn: "user@contoso.com",
                        comment_text: "great project",
                        created_datetime: "2026-01-01T00:00:00.000Z",
                    },
                ],
            }),
        );
        render(<ProjectCommentsPanel projectId="proj-A" />);

        expect(screen.getByText("great project")).toBeInTheDocument();
    });

    it("posts project-level comments with no task_id", async () => {
        const submit = vi.fn().mockResolvedValue(undefined);
        mockUseComments.mockReturnValue(baseHookState({ submit }));
        render(<ProjectCommentsPanel projectId="proj-A" />);

        fireEvent.change(screen.getByLabelText("Comment text"), { target: { value: "new note" } });
        fireEvent.click(screen.getByRole("button", { name: /post/i }));

        await waitFor(() => expect(submit).toHaveBeenCalledWith("new note"));
        // useComments was invoked with no taskId key at all — project scope only.
        expect(mockUseComments).toHaveBeenCalledWith({ projectId: "proj-A" });
    });

    it("shows submit errors without breaking the page", () => {
        mockUseComments.mockReturnValue(baseHookState({ submitError: new Error("policy rejected insert") }));
        render(<ProjectCommentsPanel projectId="proj-A" />);

        expect(screen.getByRole("alert")).toHaveTextContent("policy rejected insert");
    });
});
