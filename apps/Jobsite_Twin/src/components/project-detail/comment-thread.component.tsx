//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { CommentRecord } from "@/lib/comments-client";
import { PanelSkeleton, PanelError } from "../portfolio/panel.component";

interface CommentThreadProps {
    /** Comments to render, expected newest-first. This component does not re-sort. */
    comments: CommentRecord[];
    isLoading: boolean;
    error: Error | null;
}

/** Formats an ISO timestamp as a stable, human-readable string, e.g. "Nov 17, 2023, 3:45 PM". */
function formatTimestamp(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Reusable comment-list renderer for project- and task-level threads.
 * Comment text is interpolated as JSX text content only — never
 * `dangerouslySetInnerHTML` — so it always renders as inert text.
 */
export function CommentThread({ comments, isLoading, error }: CommentThreadProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col gap-s">
                <PanelSkeleton className="h-[56px]" />
                <PanelSkeleton className="h-[56px]" />
            </div>
        );
    }

    if (error) {
        return <PanelError message={error.message} />;
    }

    if (comments.length === 0) {
        return (
            <p className="font-base text-200 leading-200 text-muted-foreground m-0">
                No comments yet. Start the conversation.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-s m-0 p-0 list-none">
            {comments.map((comment) => (
                <li
                    key={comment.comment_id}
                    className="flex flex-col gap-xs rounded-xl border border-border bg-card px-m py-s"
                >
                    <div className="flex items-center justify-between gap-s">
                        <span className="font-heading font-semibold text-100 leading-200 text-foreground">
                            {comment.user_upn}
                        </span>
                        <span className="font-base text-100 leading-200 text-muted-foreground">
                            {formatTimestamp(comment.created_datetime)}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words font-base text-200 leading-300 text-foreground m-0">
                        {comment.comment_text}
                    </p>
                </li>
            ))}
        </ul>
    );
}
