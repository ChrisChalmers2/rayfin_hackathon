//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Shared color map for project delivery status. Kept in sync with the
 * Vega-Lite `scale.range` used by the scatter and donut specs so status
 * reads identically across every visual and the data grid.
 */
export const STATUS_COLORS: Record<string, string> = {
    "On Track": "#2e7d32",
    "At Risk": "#d97706",
    "Delayed": "#c62828",
};
