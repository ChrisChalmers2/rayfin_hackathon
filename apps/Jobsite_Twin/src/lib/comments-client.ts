//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { getRayfinClient } from "@/lib/rayfin-client";

/**
 * A comment row as returned by the Rayfin `Comment` entity. Field names match
 * the entity in `rayfin/data/Comment.ts` exactly. `created_datetime` arrives as
 * an ISO 8601 UTC string over the DAB GraphQL wire.
 */
export interface CommentRecord {
    comment_id: string;
    project_id: string;
    task_id?: string | null;
    user_upn: string;
    comment_text: string;
    created_datetime: string;
}

/**
 * Payload for creating a comment. Field names match the `Comment` entity.
 * The caller supplies `comment_id` (a UUID; `comment_id` is an application-level
 * field, distinct from DAB's auto-added `id` primary key) and `created_datetime`.
 * `task_id` is `null`/omitted for project-level comments and set for task-level.
 */
export interface CreateCommentInput {
    comment_id: string;
    project_id: string;
    task_id?: string | null;
    user_upn: string;
    comment_text: string;
    created_datetime: Date;
}

/** Every selectable field on the `Comment` entity, in declaration order. */
const COMMENT_FIELDS = [
    "comment_id",
    "project_id",
    "task_id",
    "user_upn",
    "comment_text",
    "created_datetime",
] as const;

/** The typed Rayfin data client for the `Comment` entity. */
function commentEntity() {
    return getRayfinClient().data.Comment;
}

/** Defensive newest-first ordering by `created_datetime`, independent of server order. */
function sortNewestFirst(rows: CommentRecord[]): CommentRecord[] {
    return [...rows].sort(
        (a, b) => new Date(b.created_datetime).getTime() - new Date(a.created_datetime).getTime(),
    );
}

/**
 * List project-level comments: rows for `projectId` with no `task_id`, newest first.
 */
export async function listByProject(projectId: string): Promise<CommentRecord[]> {
    const rows = (await commentEntity()
        .select(COMMENT_FIELDS)
        .where({ project_id: { eq: projectId }, task_id: { isNull: true } })
        .orderBy({ created_datetime: "desc" })
        .execute()) as CommentRecord[];
    return sortNewestFirst(rows);
}

/**
 * List task-level comments: rows for `projectId` scoped to `taskId`, newest first.
 */
export async function listByTask(projectId: string, taskId: string): Promise<CommentRecord[]> {
    const rows = (await commentEntity()
        .select(COMMENT_FIELDS)
        .where({ project_id: { eq: projectId }, task_id: { eq: taskId } })
        .orderBy({ created_datetime: "desc" })
        .execute()) as CommentRecord[];
    return sortNewestFirst(rows);
}

/**
 * Create a comment through the typed Rayfin client. The deployed row-level
 * policy rejects any insert whose `user_upn` differs from the caller's email
 * claim; errors propagate to the caller unchanged.
 */
export async function create(payload: CreateCommentInput): Promise<CommentRecord> {
    return (await commentEntity().create(payload)) as CommentRecord;
}

/**
 * List every comment (project-level and task-level) for `projectId`, newest
 * first. Used only to derive per-task comment counts for the tasks grid —
 * the Rayfin data client has no aggregate/count operator, so counts are
 * computed client-side from this list.
 */
export async function listAllForProject(projectId: string): Promise<CommentRecord[]> {
    const rows = (await commentEntity()
        .select(COMMENT_FIELDS)
        .where({ project_id: { eq: projectId } })
        .orderBy({ created_datetime: "desc" })
        .execute()) as CommentRecord[];
    return sortNewestFirst(rows);
}
