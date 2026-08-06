//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from "path";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

// See apps/Jobsite_Twin/vite.config.ts for why this exists: allows browsers
// enforcing Local Network Access checks to embed this localhost dev server
// as an iframe inside the Fabric portal.
const localNetworkAccessPlugin = {
  name: "local-network-access-headers",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      if (req.method === "OPTIONS" && req.headers["access-control-request-private-network"]) {
        const origin = req.headers.origin || "*";
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localNetworkAccessPlugin],
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
});
