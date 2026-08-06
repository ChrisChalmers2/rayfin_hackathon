//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { entity, uuid, text, date, set, authenticated } from "@microsoft/rayfin-core";

/**
 * A task tracked by the Delayed Task Notifier (F2).
 * F2's sole job: when a task's status flips to "delayed", send a Teams
 * Adaptive Card via webhook. `lastAlertedAt` is the dedup anchor — the
 * heartbeat job only alerts on tasks where it is still null, and writes it
 * atomically with the send (never after — a write failure must not risk a
 * duplicate alert).
 */
@entity()
@authenticated(["read", "create", "update", "delete"])
export class Task {
    @uuid() id!: string;
    @text({ max: 256 }) title!: string;
    @text({ max: 256 }) assignedAgent!: string;
    @date() dueDate!: Date;
    @set("not_started", "in_progress", "delayed", "complete")
    status!: "not_started" | "in_progress" | "delayed" | "complete";
    @date({ optional: true }) lastAlertedAt?: Date;
}
