//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { lazy, Suspense } from "react";
import { PortfolioOverview } from "./components/portfolio/portfolio-overview.component";
import { useHashLocation } from "./lib/hash-router";

// Lazy-loaded so the Three.js / react-three-fiber bundle only loads on the
// project detail route, keeping the portfolio landing lightweight.
const SingleProjectDetail = lazy(() =>
    import("./components/project-detail/single-project-detail.component").then((m) => ({
        default: m.SingleProjectDetail,
    })),
);

function App() {
    const { pathname } = useHashLocation();

    if (pathname.startsWith("/project/")) {
        return (
            <Suspense
                fallback={
                    <div className="flex min-h-full w-full items-center justify-center bg-background">
                        <span className="font-base text-200 text-muted-foreground">Loading project...</span>
                    </div>
                }
            >
                <SingleProjectDetail />
            </Suspense>
        );
    }

    return (
        <PortfolioOverview />
    );
}

export default App;
