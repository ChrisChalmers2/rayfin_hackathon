//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable Rayfin entity-client mock. select/where/orderBy return the same
// object so the query chain resolves to a single spy set we can assert on.
const h = vi.hoisted(() => {
    const select = vi.fn();
    const where = vi.fn();
    const orderBy = vi.fn();
    const execute = vi.fn();
    const create = vi.fn();
    const commentEntity = { select, where, orderBy, execute, create };
    return { select, where, orderBy, execute, create, commentEntity };
});

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({ data: { Comment: h.commentEntity } }),
}));

import {
    listByProject,
    listByTask,
    listAllForProject,
    create as createComment,
} from "@/lib/comments-client";
import type { CreateCommentInput } from "@/lib/comments-client";

const EXPECTED_FIELDS = [
    "comment_id",
    "project_id",
    "task_id",
    "user_upn",
    "comment_text",
    "created_datetime",
];

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
    h.select.mockReturnValue(h.commentEntity);
    h.where.mockReturnValue(h.commentEntity);
    h.orderBy.mockReturnValue(h.commentEntity);
    h.execute.mockResolvedValue([]);
    h.create.mockImplementation(async (input: unknown) => input);
});

describe("comments-client", () => {
    it("scopes project listing to project_id with a null task_id filter", async () => {
        await listByProject("proj-A");

        expect(h.select).toHaveBeenCalledWith(EXPECTED_FIELDS);
        expect(h.where).toHaveBeenCalledWith({
            project_id: { eq: "proj-A" },
            task_id: { isNull: true },
        });
    });

    it("scopes task listing to project_id and the specific task_id", async () => {
        await listByTask("proj-A", "task-1");

        expect(h.where).toHaveBeenCalledWith({
            project_id: { eq: "proj-A" },
            task_id: { eq: "task-1" },
        });
    });

    it("isolates project-level rows from task-level rows via the task_id filter", async () => {
        await listByProject("proj-A");
        const projectFilter = h.where.mock.calls[0][0];
        expect(projectFilter.task_id).toEqual({ isNull: true });
        expect(projectFilter.task_id).not.toHaveProperty("eq");

        h.where.mockClear();
        await listByTask("proj-A", "task-1");
        const taskFilter = h.where.mock.calls[0][0];
        expect(taskFilter.task_id).toEqual({ eq: "task-1" });
        expect(taskFilter.task_id).not.toHaveProperty("isNull");
    });

    it("returns rows sorted newest-first by created_datetime", async () => {
        h.execute.mockResolvedValue([
            row({ comment_id: "old", created_datetime: "2026-01-01T00:00:00.000Z" }),
            row({ comment_id: "new", created_datetime: "2026-03-01T00:00:00.000Z" }),
            row({ comment_id: "mid", created_datetime: "2026-02-01T00:00:00.000Z" }),
        ]);

        const rows = await listByProject("proj-A");

        expect(rows.map((r) => r.comment_id)).toEqual(["new", "mid", "old"]);
        expect(h.orderBy).toHaveBeenCalledWith({ created_datetime: "desc" });
    });

    it("creates a project-level comment with task_id null and exact field names", async () => {
        const payload: CreateCommentInput = {
            comment_id: "c-1",
            project_id: "proj-A",
            task_id: null,
            user_upn: "user@contoso.com",
            comment_text: "project note",
            created_datetime: new Date("2026-01-01T00:00:00.000Z"),
        };

        await createComment(payload);

        expect(h.create).toHaveBeenCalledWith(payload);
        const arg = h.create.mock.calls[0][0];
        expect(arg.task_id).toBeNull();
        expect(Object.keys(arg).sort()).toEqual([...EXPECTED_FIELDS].sort());
    });

    it("creates a task-level comment with task_id set", async () => {
        const payload: CreateCommentInput = {
            comment_id: "c-2",
            project_id: "proj-A",
            task_id: "task-9",
            user_upn: "user@contoso.com",
            comment_text: "task note",
            created_datetime: new Date("2026-01-01T00:00:00.000Z"),
        };

        await createComment(payload);

        expect(h.create.mock.calls[0][0].task_id).toBe("task-9");
    });

    it("propagates list errors from the Rayfin client", async () => {
        h.execute.mockRejectedValue(new Error("list failed"));
        await expect(listByProject("proj-A")).rejects.toThrow("list failed");
    });

    it("propagates create errors from the Rayfin client", async () => {
        h.create.mockRejectedValue(new Error("policy rejected insert"));
        const payload: CreateCommentInput = {
            comment_id: "c-3",
            project_id: "proj-A",
            task_id: null,
            user_upn: "user@contoso.com",
            comment_text: "will fail",
            created_datetime: new Date("2026-01-01T00:00:00.000Z"),
        };
        await expect(createComment(payload)).rejects.toThrow("policy rejected insert");
    });

    it("lists every comment (project- and task-level) for a project, newest first", async () => {
        h.execute.mockResolvedValue([
            row({ comment_id: "proj-row", task_id: null, created_datetime: "2026-01-01T00:00:00.000Z" }),
            row({ comment_id: "task-row", task_id: "task-1", created_datetime: "2026-02-01T00:00:00.000Z" }),
        ]);

        const rows = await listAllForProject("proj-A");

        expect(h.where).toHaveBeenCalledWith({ project_id: { eq: "proj-A" } });
        expect(rows.map((r) => r.comment_id)).toEqual(["task-row", "proj-row"]);
    });

    it("propagates listAllForProject errors from the Rayfin client", async () => {
        h.execute.mockRejectedValue(new Error("list-all failed"));
        await expect(listAllForProject("proj-A")).rejects.toThrow("list-all failed");
    });
});
