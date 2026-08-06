//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { MAX_COMMENT_LENGTH } from "@/hooks/use-comments";

interface CommentFormProps {
    /** Posts `text`. Reject (throw) on failure so the form can keep the draft. */
    onSubmit: (text: string) => Promise<void>;
    placeholder?: string;
    className?: string;
}

/** Reusable textarea + Post form with character-limit validation and a counter. */
export function CommentForm({ onSubmit, placeholder = "Add a comment…", className }: CommentFormProps) {
    const [text, setText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const trimmedLength = text.trim().length;
    const isEmpty = trimmedLength === 0;
    const isOverLimit = text.length > MAX_COMMENT_LENGTH;
    const isValid = !isEmpty && !isOverLimit;
    const canSubmit = isValid && !isSubmitting;

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        setFormError(null);
        try {
            await onSubmit(text);
            setText("");
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-s", className)}>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                disabled={isSubmitting}
                rows={3}
                aria-label="Comment text"
                aria-invalid={isOverLimit}
                className={cn(
                    "w-full resize-none rounded-xl border bg-card px-m py-s font-base text-200 leading-200 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isOverLimit ? "border-destructive" : "border-border",
                )}
            />
            <div className="flex items-center justify-between gap-s">
                <span
                    className={cn(
                        "font-base text-100 leading-200 tabular-nums",
                        isOverLimit ? "text-destructive" : "text-muted-foreground",
                    )}
                >
                    {text.length} / {MAX_COMMENT_LENGTH}
                    {isOverLimit ? " — over limit" : ""}
                </span>
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-primary px-l py-s font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Posting…" : "Post"}
                </button>
            </div>
            {formError ? (
                <p role="alert" className="font-base text-100 leading-200 text-destructive m-0">
                    {formError}
                </p>
            ) : null}
        </form>
    );
}
