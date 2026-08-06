//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useComments } from "@/hooks/use-comments";
import { Panel } from "../portfolio/panel.component";
import { CommentThread } from "./comment-thread.component";
import { CommentForm } from "./comment-form.component";

interface ProjectCommentsPanelProps {
    projectId: string;
}

/** Project-level comments panel shown on the single-project detail page. */
export function ProjectCommentsPanel({ projectId }: ProjectCommentsPanelProps) {
    const { comments, isLoading, error, submitError, submit } = useComments({ projectId });

    return (
        <Panel title="Project Comments" subtitle="Discussion and updates for this project">
            <div className="flex flex-col gap-l">
                <CommentThread comments={comments} isLoading={isLoading} error={error} />
                <CommentForm onSubmit={submit} placeholder="Add a project comment…" />
                {submitError ? (
                    <p role="alert" className="font-base text-100 leading-200 text-destructive m-0">
                        {submitError.message}
                    </p>
                ) : null}
            </div>
        </Panel>
    );
}
