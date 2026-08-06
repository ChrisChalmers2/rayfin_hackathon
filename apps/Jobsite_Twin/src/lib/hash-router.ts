//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useMemo, useSyncExternalStore } from "react";

interface HashLocation {
    pathname: string;
    search: string;
    key: string;
}

function emitRouteChange(): void {
    window.dispatchEvent(new Event("hashchange"));
}

function parseHash(): HashLocation {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [pathPart, searchPart = ""] = raw.split("?", 2);
    return {
        pathname: pathPart.startsWith("/") ? pathPart : `/${pathPart}`,
        search: searchPart ? `?${searchPart}` : "",
        key: window.history.length <= 1 ? "default" : "hash",
    };
}

function subscribe(onStoreChange: () => void): () => void {
    window.addEventListener("hashchange", onStoreChange);
    window.addEventListener("popstate", onStoreChange);
    return () => {
        window.removeEventListener("hashchange", onStoreChange);
        window.removeEventListener("popstate", onStoreChange);
    };
}

function getSnapshot(): string {
    return window.location.hash || "#/";
}

function toRoute(value: string): string {
    return value.startsWith("/") ? value : `/${value}`;
}

function setHashRoute(route: string, replace = false): void {
    const next = `#${toRoute(route)}`;
    if (replace) {
        window.history.replaceState(null, "", next);
    } else {
        window.history.pushState(null, "", next);
    }
    emitRouteChange();
}

export function useHashLocation(): HashLocation {
    useSyncExternalStore(subscribe, getSnapshot, () => "#/");
    return parseHash();
}

export function useHashNavigate(): (to: string | number) => void {
    return useCallback((to: string | number) => {
        if (typeof to === "number") {
            if (to < 0 && window.history.length <= 1) {
                setHashRoute("/", true);
                return;
            }
            window.history.go(to);
            return;
        }
        setHashRoute(to);
    }, []);
}

export function useHashParams(): { projectId?: string } {
    const { pathname } = useHashLocation();
    return useMemo(() => {
        const match = /^\/project\/([^/?#]+)$/.exec(pathname);
        return match ? { projectId: decodeURIComponent(match[1]) } : {};
    }, [pathname]);
}

export function useHashSearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
    const { pathname, search } = useHashLocation();
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const setParams = useCallback(
        (next: URLSearchParams) => {
            const query = next.toString();
            setHashRoute(`${pathname}${query ? `?${query}` : ""}`, true);
        },
        [pathname],
    );

    return [params, setParams];
}
