//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCommentsDrawer } from "@/components/project-detail/task-comments-drawer.component";

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
    mockUseComments.mockReturnValue(baseHookState());
});

describe("TaskCommentsDrawer", () => {
    it("is hidden when no task is selected", () => {
        render(<TaskCommentsDrawer projectId="proj-A" task={null} onClose={vi.fn()} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens with the selected task's name and id", () => {
        render(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-1", taskName: "Pour foundation" }}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Pour foundation")).toBeInTheDocument();
        expect(screen.getByText("task-1")).toBeInTheDocument();
    });

    it("loads comments for the selected project_id + task_id only", () => {
        render(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-1", taskName: "Pour foundation" }}
                onClose={vi.fn()}
            />,
        );

        expect(mockUseComments).toHaveBeenCalledWith({ projectId: "proj-A", taskId: "task-1" });
    });

    it("posts a task-level comment with the selected task_id", () => {
        const submit = vi.fn().mockResolvedValue(undefined);
        mockUseComments.mockReturnValue(baseHookState({ submit }));

        render(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-1", taskName: "Pour foundation" }}
                onClose={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByLabelText("Comment text"), { target: { value: "task update" } });
        fireEvent.click(screen.getByRole("button", { name: /post/i }));

        expect(submit).toHaveBeenCalledWith("task update");
    });

    it("hides the drawer when the close button is clicked", () => {
        const onClose = vi.fn();
        render(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-1", taskName: "Pour foundation" }}
                onClose={onClose}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /close task comments/i }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("refreshes scope when switching tasks", () => {
        const { rerender } = render(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-1", taskName: "Pour foundation" }}
                onClose={vi.fn()}
            />,
        );
        expect(mockUseComments).toHaveBeenLastCalledWith({ projectId: "proj-A", taskId: "task-1" });

        rerender(
            <TaskCommentsDrawer
                projectId="proj-A"
                task={{ taskId: "task-2", taskName: "Frame walls" }}
                onClose={vi.fn()}
            />,
        );
        expect(mockUseComments).toHaveBeenLastCalledWith({ projectId: "proj-A", taskId: "task-2" });
        expect(screen.getByText("Frame walls")).toBeInTheDocument();
    });
});
