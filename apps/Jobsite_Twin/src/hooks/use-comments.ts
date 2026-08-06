//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { create, listByProject, listByTask, type CommentRecord } from "@/lib/comments-client";
import { useCurrentUserUpn } from "./use-current-user-upn";

/** Maximum allowed `comment_text` length, matching the `Comment` entity's `@text({ max: 2000 })`. */
export const MAX_COMMENT_LENGTH = 2000;

/** Blocks empty/whitespace-only text and anything over {@link MAX_COMMENT_LENGTH}. */
export function isValidCommentText(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_COMMENT_LENGTH;
}

export interface UseCommentsOptions {
    /** Lakehouse project identifier. */
    projectId: string;
    /** Lakehouse task identifier. Omit/null for project-level comments. */
    taskId?: string | null;
    /** Called after a successful post (create + refetch). Lets callers (e.g. the
     * task comments drawer) notify a sibling component — such as the tasks
     * grid's per-task comment counts — that new data is available. */
    onCommentPosted?: () => void;
}

export interface UseCommentsResult {
    /** Newest-first comments for the current project/task scope. */
    comments: CommentRecord[];
    /** True while the initial/refetch load is in flight. */
    isLoading: boolean;
    /** Set when the load fails; cleared on the next successful load. */
    error: Error | null;
    /** True while a post is in flight. */
    isSubmitting: boolean;
    /** Set when the most recent post failed; cleared on the next attempt. */
    submitError: Error | null;
    /**
     * Validates and posts `text`. Appends an optimistic row immediately, then
     * refetches on success (keeping the row) or rolls the optimistic row back
     * and sets `submitError` on failure. Rethrows on failure so callers (e.g.
     * the comment form) can keep the user's draft text. Invalid text is a
     * silent no-op — no optimistic row, no create call.
     */
    submit: (text: string) => Promise<void>;
    /** Re-runs the current project/task load. */
    refetch: () => Promise<void>;
}

/**
 * Loads and posts comments scoped to a project (or a single task within it),
 * via the typed Rayfin `Comment` client. Handles loading/error state,
 * optimistic append on submit, rollback on failed create, and refetch after
 * a successful post.
 */
export function useComments({ projectId, taskId, onCommentPosted }: UseCommentsOptions): UseCommentsResult {
    const userUpn = useCurrentUserUpn();
    const [comments, setComments] = useState<CommentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const rows = taskId ? await listByTask(projectId, taskId) : await listByProject(projectId);
            setComments(rows);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [projectId, taskId]);

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) void load();
        });
        return () => {
            cancelled = true;
        };
    }, [load]);

    const submit = useCallback(
        async (text: string) => {
            if (!isValidCommentText(text)) return;

            const commentText = text.trim();
            setSubmitError(null);

            if (!userUpn) {
                setSubmitError(new Error("Cannot post a comment: no signed-in user UPN."));
                return;
            }

            setIsSubmitting(true);
            // Must be a real UUID: `comment_id` is declared `@uuid()` on the server entity,
            // so a non-UUID placeholder (e.g. a "optimistic-<timestamp>" string) is rejected
            // by the DAB GraphQL layer with a field-type mismatch error. Using a real UUID
            // here means the optimistic id IS the final id (no swap needed on success).
            const optimisticId = crypto.randomUUID();
            const optimistic: CommentRecord = {
                comment_id: optimisticId,
                project_id: projectId,
                task_id: taskId ?? null,
                user_upn: userUpn,
                comment_text: commentText,
                created_datetime: new Date().toISOString(),
            };

            setComments((prev) => [optimistic, ...prev]);

            try {
                await create({
                    comment_id: optimisticId,
                    project_id: projectId,
                    task_id: taskId ?? null,
                    user_upn: userUpn,
                    comment_text: commentText,
                    created_datetime: new Date(),
                });
                await load();
                onCommentPosted?.();
            } catch (err) {
                const normalized = err instanceof Error ? err : new Error(String(err));
                setComments((prev) => prev.filter((c) => c.comment_id !== optimisticId));
                setSubmitError(normalized);
                throw normalized;
            } finally {
                setIsSubmitting(false);
            }
        },
        [projectId, taskId, userUpn, load, onCommentPosted],
    );

    return { comments, isLoading, error, isSubmitting, submitError, submit, refetch: load };
}
