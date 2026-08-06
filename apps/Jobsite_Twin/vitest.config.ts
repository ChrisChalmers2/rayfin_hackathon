//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["src/test/setup.ts"],
        globals: true,
        server: {
            deps: {
                // These packages ship extensionless ESM re-exports that Vitest's
                // resolver can't follow on its own; inlining lets Vite resolve them.
                inline: [
                    /@fluentui\/react-icons/,
                    /@microsoft\/fabric-datagrid/,
                    /@microsoft\/fabric-visuals/,
                ],
            },
        },
    },
    resolve: {
        alias: { "@": resolve(import.meta.dirname, "src") },
    },
});
