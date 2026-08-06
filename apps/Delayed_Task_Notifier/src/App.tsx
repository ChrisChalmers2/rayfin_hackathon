//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Placeholder status page. F2's actual work happens server-side (scheduled
 * jobs + Teams webhook), so the frontend is intentionally minimal for now —
 * a `/summary` metrics view lands on Day 10 (see docs/F2 execution guide).
 */
export default function App() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Delayed Task Notifier</h1>
      <p>F2 — Teams Adaptive Card alerts for delayed tasks. Backend scaffold in progress (Day 1).</p>
    </main>
  );
}
