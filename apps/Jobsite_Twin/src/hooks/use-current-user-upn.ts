//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getRayfinClient } from "@/lib/rayfin-client";

/**
 * Reads the signed-in user's UPN (Entra ID email claim) directly from the
 * Rayfin session — the same identity the deployed `Comment` create/update/delete
 * policies enforce via `claims.email eq item.user_upn`.
 *
 * This is deliberately independent of `AuthContextValue`: it reads the
 * supported Rayfin session surface (`client.auth.getSession()`) so the comments
 * layer can derive `user_upn` without widening the app-wide auth context.
 * Returns `null` when no user is authenticated (e.g. standalone, pre-handoff).
 */
export function getCurrentUserUpn(): string | null {
    return getRayfinClient().auth.getSession().user?.email ?? null;
}

/**
 * React hook form of {@link getCurrentUserUpn}. Reads the current UPN on mount
 * and stays in sync with the Rayfin session via `onSessionChange`, so the value
 * settles once the embedded Fabric auth handoff completes.
 */
export function useCurrentUserUpn(): string | null {
    const [upn, setUpn] = useState<string | null>(() => getCurrentUserUpn());

    useEffect(() => {
        const auth = getRayfinClient().auth;
        const unsubscribe = auth.onSessionChange((session) => {
            setUpn(session?.user?.email ?? null);
        });
        return unsubscribe;
    }, []);

    return upn;
}
