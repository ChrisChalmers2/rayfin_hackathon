//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { X } from "lucide-react";
import { useComments } from "@/hooks/use-comments";
import { CommentThread } from "./comment-thread.component";
import { CommentForm } from "./comment-form.component";

/** Minimal task identity needed to scope and label the drawer. */
export interface SelectedTask {
    taskId: string;
    taskName: string;
}

interface TaskCommentsDrawerProps {
    projectId: string;
    /** The task the drawer is scoped to, or `null` to keep the drawer hidden. */
    task: SelectedTask | null;
    onClose: () => void;
    /** Called after a comment is successfully posted for this task, so the
     * tasks grid can refresh its per-task comment count. */
    onCommentPosted?: () => void;
}

/** Slide-over drawer of comments scoped to a single task. Hidden when `task` is `null`. */
export function TaskCommentsDrawer({ projectId, task, onClose, onCommentPosted }: TaskCommentsDrawerProps) {
    // Always call the hook (rules-of-hooks) — when `task` is null, taskId is
    // undefined, which falls back to a project-level scope that no visible UI
    // reads since the component returns null below.
    const { comments, isLoading, error, submitError, submit } = useComments({
        projectId,
        taskId: task?.taskId,
        onCommentPosted,
    });

    if (!task) return null;

    return (
        <div
            role="dialog"
            aria-label={`Comments for ${task.taskName}`}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col gap-l border-l border-border bg-card p-l shadow-xl"
        >
            <div className="flex items-start justify-between gap-s">
                <div>
                    <h3 className="font-heading font-semibold uppercase tracking-wide text-300 leading-300 text-foreground m-0">
                        {task.taskName}
                    </h3>
                    <p className="font-base text-100 leading-200 text-muted-foreground m-0 mt-xxs">{task.taskId}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close task comments"
                    className="flex h-xl w-xl shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-hover"
                >
                    <X className="icon-size-100" aria-hidden />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                <CommentThread comments={comments} isLoading={isLoading} error={error} />
            </div>
            <CommentForm onSubmit={submit} placeholder="Add a task comment…" />
            {submitError ? (
                <p role="alert" className="font-base text-100 leading-200 text-destructive m-0">
                    {submitError.message}
                </p>
            ) : null}
        </div>
    );
}
