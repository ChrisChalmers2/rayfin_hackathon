//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommentThread } from "@/components/project-detail/comment-thread.component";
import type { CommentRecord } from "@/lib/comments-client";

function row(overrides: Partial<CommentRecord> = {}): CommentRecord {
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

describe("CommentThread", () => {
    it("shows the empty-state message when there are no comments", () => {
        render(<CommentThread comments={[]} isLoading={false} error={null} />);
        expect(screen.getByText("No comments yet. Start the conversation.")).toBeInTheDocument();
    });

    it("shows a loading indicator while loading", () => {
        render(<CommentThread comments={[]} isLoading={true} error={null} />);
        expect(screen.queryByText("No comments yet. Start the conversation.")).not.toBeInTheDocument();
        expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    });

    it("shows an error state when loading fails", () => {
        render(<CommentThread comments={[]} isLoading={false} error={new Error("load failed")} />);
        expect(screen.getByText("load failed")).toBeInTheDocument();
    });

    it("renders comments newest-first when passed sorted data", () => {
        const comments = [
            row({ comment_id: "new", comment_text: "newest", created_datetime: "2026-03-01T00:00:00.000Z" }),
            row({ comment_id: "old", comment_text: "oldest", created_datetime: "2026-01-01T00:00:00.000Z" }),
        ];
        render(<CommentThread comments={comments} isLoading={false} error={null} />);

        const items = screen.getAllByRole("listitem");
        expect(items[0]).toHaveTextContent("newest");
        expect(items[1]).toHaveTextContent("oldest");
    });

    it("uses user_upn as the author label", () => {
        render(<CommentThread comments={[row({ user_upn: "author@contoso.com" })]} isLoading={false} error={null} />);
        expect(screen.getByText("author@contoso.com")).toBeInTheDocument();
    });

    it("renders the timestamp in a stable, human-readable form", () => {
        render(<CommentThread comments={[row({ created_datetime: "2026-01-01T00:00:00.000Z" })]} isLoading={false} error={null} />);
        // Rendered form should differ from the raw ISO string but still be present.
        expect(screen.queryByText("2026-01-01T00:00:00.000Z")).not.toBeInTheDocument();
        const timestamp = screen.getByText(/\d{4}/);
        expect(timestamp).toBeInTheDocument();
        expect(timestamp.textContent).not.toBe("2026-01-01T00:00:00.000Z");
    });

    it("renders comment text with HTML-like characters as inert text, never as HTML", () => {
        const dangerous = '<script>alert("x")</script>&\'"';
        const { container } = render(
            <CommentThread comments={[row({ comment_text: dangerous })]} isLoading={false} error={null} />,
        );

        expect(container.querySelector("script")).toBeNull();
        expect(container.textContent).toContain(dangerous);
    });
});
