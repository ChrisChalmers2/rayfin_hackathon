//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/** A single project zone (floor/location) with per-status task counts. */
export interface Zone {
    locationId: string;
    zoneName: string;
    x: number;
    y: number;
    z: number;
    delayed: number;
    atRisk: number;
    onTrack: number;
    complete: number;
    totalTasks: number;
}

/** A single task within a project. */
export interface ProjectTask {
    taskId: string;
    taskName: string;
    taskStatus: string;
    locationId: string;
    delayDays: number | null;
}
