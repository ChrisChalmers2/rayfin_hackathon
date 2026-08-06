//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Sentinel token embedded in portfolio DAX queries at the exact point where an
 * optional `projects[status]` filter argument is injected. Removing it leaves
 * the query byte-identical to its unfiltered form.
 */
export const STATUS_FILTER_SENTINEL = "__STATUS_FILTER_ARG__";

/**
 * Substitutes the `__STATUS_FILTER_ARG__` sentinel in a base DAX query with an
 * optional status filter argument.
 *
 * When `status` is omitted (or empty) the sentinel is removed entirely, so the
 * query is byte-identical to its unfiltered baseline. When present, the sentinel
 * expands to a leading-comma `FILTER(ALL(projects[status]), ...)` fragment that
 * slots in as an additional argument in both `SUMMARIZECOLUMNS(...)` (filter-table
 * arg) and `CALCULATETABLE(ROW(...))` contexts.
 *
 * The status value is escaped for safe embedding inside a DAX string literal
 * (doubles any `"` so a value cannot break out of the literal).
 */
export function applyStatusFilter(baseQuery: string, status?: string | null): string {
    if (status == null || status === "") {
        return baseQuery.replaceAll(STATUS_FILTER_SENTINEL, "");
    }
    const escaped = status.replace(/"/g, '""');
    const filterArg = `, FILTER(ALL(projects[status]), projects[status] = "${escaped}")`;
    return baseQuery.replaceAll(STATUS_FILTER_SENTINEL, filterArg);
}
