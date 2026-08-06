//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { worstZoneStatus, zoneColor, TASK_STATUS_COLORS, NO_TASKS_COLOR } from "./task-status";

describe("worstZoneStatus", () => {
    it("prefers Delayed over every other status", () => {
        expect(worstZoneStatus({ delayed: 1, atRisk: 5, onTrack: 9, complete: 3 })).toBe("Delayed");
    });

    it("falls to At Risk when no delayed tasks", () => {
        expect(worstZoneStatus({ delayed: 0, atRisk: 2, onTrack: 9, complete: 3 })).toBe("At Risk");
    });

    it("uses On Track over Complete", () => {
        expect(worstZoneStatus({ delayed: 0, atRisk: 0, onTrack: 1, complete: 4 })).toBe("On Track");
    });

    it("uses Complete when it is the only work", () => {
        expect(worstZoneStatus({ delayed: 0, atRisk: 0, onTrack: 0, complete: 4 })).toBe("Complete");
    });

    it("returns null for an empty zone", () => {
        expect(worstZoneStatus({ delayed: 0, atRisk: 0, onTrack: 0, complete: 0 })).toBeNull();
    });
});

describe("zoneColor", () => {
    it("maps the worst status to its color", () => {
        expect(zoneColor({ delayed: 1, atRisk: 0, onTrack: 0, complete: 0 })).toBe(TASK_STATUS_COLORS.Delayed);
        expect(zoneColor({ delayed: 0, atRisk: 0, onTrack: 0, complete: 2 })).toBe(TASK_STATUS_COLORS.Complete);
    });

    it("uses the neutral color for an empty zone", () => {
        expect(zoneColor({ delayed: 0, atRisk: 0, onTrack: 0, complete: 0 })).toBe(NO_TASKS_COLOR);
    });
});
