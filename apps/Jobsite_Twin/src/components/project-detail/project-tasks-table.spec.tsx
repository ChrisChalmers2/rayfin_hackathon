//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectTasksTable } from "@/components/project-detail/project-tasks-table.component";

const mockUseSemanticModelQuery = vi.fn();
vi.mock("@/hooks/use-semantic-model-query", () => ({
    useSemanticModelQuery: (...args: unknown[]) => mockUseSemanticModelQuery(...args),
}));

const mockListAllForProject = vi.fn();
vi.mock("@/lib/comments-client", () => ({
    listAllForProject: (...args: unknown[]) => mockListAllForProject(...args),
}));

// Column order matches project-detail-tasks.ts's DAX column keys.
const COLUMN_NAMES = [
    "[task_id]",
    "[task_name]",
    "[task_status]",
    "[location_id]",
    "[zone_name]",
    "[planned_end_date]",
    "[actual_end_date]",
    "[delay_days]",
];

function taskRow({
    taskId,
    taskName,
    zoneName = "Zone A",
    status = "On Track",
    delayDays = 0,
}: {
    taskId: string;
    taskName: string;
    zoneName?: string;
    status?: string;
    delayDays?: number;
}) {
    return [taskId, taskName, status, `loc-${zoneName}`, zoneName, "2026-01-01", "2026-01-05", delayDays];
}

function mockSuccess(rows: unknown[][]) {
    mockUseSemanticModelQuery.mockReturnValue({
        data: {
            status: "success",
            table: { columns: COLUMN_NAMES.map((name) => ({ name })), rows },
            fromCache: false,
            cachedAt: undefined,
        },
        isLoading: false,
        error: undefined,
        refetch: vi.fn(),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockListAllForProject.mockResolvedValue([]);
});

describe("ProjectTasksTable", () => {
    it("shows a comment-count column", async () => {
        mockSuccess([taskRow({ taskId: "task-1", taskName: "Pour foundation" })]);

        render(<ProjectTasksTable projectId="proj-A" onSelectZoneName={vi.fn()} onSelectTaskComments={vi.fn()} />);

        expect(await screen.findByText("Comments")).toBeInTheDocument();
    });

    it("groups counts by task_id", async () => {
        mockSuccess([
            taskRow({ taskId: "task-1", taskName: "Pour foundation" }),
            taskRow({ taskId: "task-2", taskName: "Frame walls" }),
        ]);
        mockListAllForProject.mockResolvedValue([
            { comment_id: "c-1", project_id: "proj-A", task_id: "task-1", user_upn: "a@b.com", comment_text: "x", created_datetime: "2026-01-01T00:00:00.000Z" },
            { comment_id: "c-2", project_id: "proj-A", task_id: "task-1", user_upn: "a@b.com", comment_text: "y", created_datetime: "2026-01-02T00:00:00.000Z" },
            { comment_id: "c-3", project_id: "proj-A", task_id: "task-2", user_upn: "a@b.com", comment_text: "z", created_datetime: "2026-01-03T00:00:00.000Z" },
            { comment_id: "c-4", project_id: "proj-A", task_id: null, user_upn: "a@b.com", comment_text: "project-level", created_datetime: "2026-01-04T00:00:00.000Z" },
        ]);

        render(<ProjectTasksTable projectId="proj-A" onSelectZoneName={vi.fn()} onSelectTaskComments={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /view comments for Pour foundation/i })).toHaveTextContent("2");
        });
        expect(screen.getByRole("button", { name: /view comments for Frame walls/i })).toHaveTextContent("1");
    });

    it("shows 0 for tasks with no comments", async () => {
        mockSuccess([taskRow({ taskId: "task-1", taskName: "Pour foundation" })]);
        mockListAllForProject.mockResolvedValue([]);

        render(<ProjectTasksTable projectId="proj-A" onSelectZoneName={vi.fn()} onSelectTaskComments={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /view comments for Pour foundation/i })).toHaveTextContent("0");
        });
    });

    it("invokes the task-comment callback with the correct task id/name when clicked", async () => {
        mockSuccess([taskRow({ taskId: "task-1", taskName: "Pour foundation" })]);
        const onSelectTaskComments = vi.fn();

        render(
            <ProjectTasksTable projectId="proj-A" onSelectZoneName={vi.fn()} onSelectTaskComments={onSelectTaskComments} />,
        );

        const button = await screen.findByRole("button", { name: /view comments for Pour foundation/i });
        fireEvent.click(button);

        expect(onSelectTaskComments).toHaveBeenCalledWith("task-1", "Pour foundation");
    });

    it("still invokes zone selection when a non-comment cell is clicked", async () => {
        mockSuccess([taskRow({ taskId: "task-1", taskName: "Pour foundation", zoneName: "Zone A" })]);
        const onSelectZoneName = vi.fn();

        render(
            <ProjectTasksTable projectId="proj-A" onSelectZoneName={onSelectZoneName} onSelectTaskComments={vi.fn()} />,
        );

        const zoneCell = await screen.findByText("Zone A");
        fireEvent.click(zoneCell);

        expect(onSelectZoneName).toHaveBeenCalledWith("Zone A");
    });

    it("renders without errors with default sorting", async () => {
        mockSuccess([
            taskRow({ taskId: "task-1", taskName: "Pour foundation", delayDays: 5 }),
            taskRow({ taskId: "task-2", taskName: "Frame walls", delayDays: 1 }),
        ]);

        render(<ProjectTasksTable projectId="proj-A" onSelectZoneName={vi.fn()} onSelectTaskComments={vi.fn()} />);

        expect(await screen.findByText("Pour foundation")).toBeInTheDocument();
        expect(screen.getByText("Frame walls")).toBeInTheDocument();
    });
});
