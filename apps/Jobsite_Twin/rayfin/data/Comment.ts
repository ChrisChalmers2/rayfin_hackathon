//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { entity, uuid, text, date, authenticated } from "@microsoft/rayfin-core";

/**
 * Comment on a project (task_id null) or a specific task (task_id set).
 * Stored in the Rayfin DAB/MSSQL store; project_id/task_id reference Lakehouse rows.
 * Identity is non-overridable: the create policy rejects any insert whose
 * user_upn does not equal the caller's email claim.
 *
 * Primary-key note: the installed Rayfin SDK hardcodes its single supported
 * primary-key field name to `id` (see `PrimaryKeyField` in
 * `@microsoft/rayfin-core`'s `schema.ts` — the schema analyzer only treats a
 * field as the primary key when it is literally named `id`; it flags/adds a
 * default `id` field otherwise). Because this entity's stable identifier is
 * named `comment_id` (not `id`), it cannot be declared as the DB primary key
 * with this SDK version. Rayfin therefore auto-adds its own `id` primary key
 * column under the hood. `comment_id` remains an application-level UUID:
 * callers generate it, use it to key optimistic UI updates, and select it
 * explicitly (it is never omitted from queries), but it is not the row's
 * database primary key.
 */
@entity()
@authenticated("read")
@authenticated("create", { policy: (claims, item) => claims.email.eq(item.user_upn) })
@authenticated("update", { policy: (claims, item) => claims.email.eq(item.user_upn) })
@authenticated("delete", { policy: (claims, item) => claims.email.eq(item.user_upn) })
export class Comment {
    @uuid() comment_id!: string;
    @text({ max: 64 }) project_id!: string;
    @text({ max: 64, optional: true }) task_id?: string;
    @text({ max: 256 }) user_upn!: string;
    @text({ max: 2000 }) comment_text!: string;
    @date() created_datetime!: Date;
}
