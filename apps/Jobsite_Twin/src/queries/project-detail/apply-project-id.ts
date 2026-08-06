//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Substitutes the `__PROJECT_ID__` sentinel in a base DAX query with the
 * given project id, escaping it for safe embedding inside a DAX string
 * literal (doubles any `"` so a value can't break out of the literal).
 */
export function applyProjectId(baseQuery: string, projectId: string): string {
    const escaped = projectId.replace(/"/g, '""');
    return baseQuery.replaceAll("__PROJECT_ID__", escaped);
}
