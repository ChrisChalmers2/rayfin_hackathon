//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentForm } from "@/components/project-detail/comment-form.component";

function getTextarea() {
    return screen.getByLabelText("Comment text") as HTMLTextAreaElement;
}

function getPostButton() {
    return screen.getByRole("button", { name: /post/i });
}

describe("CommentForm", () => {
    let onSubmit: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

    beforeEach(() => {
        onSubmit = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    });

    it("disables Post for whitespace-only input", () => {
        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "   " } });
        expect(getPostButton()).toBeDisabled();
    });

    it("disables Post for empty input", () => {
        render(<CommentForm onSubmit={onSubmit} />);
        expect(getPostButton()).toBeDisabled();
    });

    it("enables Post for exactly 2000 characters", () => {
        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "a".repeat(2000) } });
        expect(getPostButton()).toBeEnabled();
    });

    it("disables Post and shows an over-limit state for 2001 characters", () => {
        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "a".repeat(2001) } });
        expect(getPostButton()).toBeDisabled();
        expect(screen.getByText(/over limit/i)).toBeInTheDocument();
    });

    it("updates the character counter as the user types", () => {
        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "hello" } });
        expect(screen.getByText("5 / 2000")).toBeInTheDocument();
    });

    it("disables Post while submitting", async () => {
        let resolveSubmit: () => void = () => {};
        onSubmit.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveSubmit = resolve;
                }),
        );

        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "in flight" } });
        fireEvent.click(getPostButton());

        await waitFor(() => expect(getPostButton()).toBeDisabled());

        resolveSubmit();
        await waitFor(() => expect(getTextarea().value).toBe(""));
    });

    it("clears the textarea on successful submit", async () => {
        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "great work" } });
        fireEvent.click(getPostButton());

        await waitFor(() => expect(getTextarea().value).toBe(""));
        expect(onSubmit).toHaveBeenCalledWith("great work");
    });

    it("keeps the entered text and shows an error path on failed submit", async () => {
        onSubmit.mockRejectedValue(new Error("policy rejected insert"));

        render(<CommentForm onSubmit={onSubmit} />);
        fireEvent.change(getTextarea(), { target: { value: "will fail" } });
        fireEvent.click(getPostButton());

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("policy rejected insert"));
        expect(getTextarea().value).toBe("will fail");
    });
});
