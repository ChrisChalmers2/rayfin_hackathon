#!/usr/bin/env node

//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

// Task 7.7 — honest-vs-spoofed Rayfin `Comment` identity validation.
//
// Proves the deployed Rayfin row-level-security policy (not something a local
// mocked unit test can prove): an insert whose `user_upn` matches the
// caller's `claims.email` succeeds, and an insert with a different
// `user_upn` (a spoofed author) is rejected — even though nothing on the
// wire prevents a malicious client from sending a different `user_upn`.
//
// This script must be run against a live, deployed Fabric/Rayfin backend
// with a real signed-in Entra ID session. It intentionally contains NO
// secrets, tenant IDs, or endpoints — every value is read from environment
// variables you provide at run time.
//
// Required environment variables:
//   RAYFIN_API_URL          Deployed Rayfin API base URL
//                            (same value as VITE_RAYFIN_API_URL in .env.local).
//   RAYFIN_PUBLISHABLE_KEY   Deployed Rayfin publishable key
//                            (same value as VITE_RAYFIN_PUBLISHABLE_KEY).
//   RAYFIN_ACCESS_TOKEN      A bearer token for a real, currently signed-in
//                            Entra ID user. Obtain this from the browser
//                            session after signing in through the app's
//                            normal Fabric-embedded auth flow (e.g. via your
//                            browser's dev tools -> Application/Storage, or
//                            by temporarily logging `getSession()` from
//                            `use-current-user-upn.ts` during a local debug
//                            session). Never commit this value.
//   VALIDATE_USER_EMAIL      The expected `claims.email` for the signed-in
//                            user supplying RAYFIN_ACCESS_TOKEN. Used as the
//                            "honest" user_upn.
//   VALIDATE_SPOOFED_EMAIL   (optional) A different email address to use for
//                            the spoofed insert. Defaults to
//                            "spoofed-user@example.invalid".
//
// Usage:
//   RAYFIN_API_URL=... RAYFIN_PUBLISHABLE_KEY=... RAYFIN_ACCESS_TOKEN=... \
//   VALIDATE_USER_EMAIL=you@yourtenant.com \
//   node scripts/validate-task-7-7-identity.mjs
//
// or, once dependencies are installed:
//   npm run validate:task-7.7
//
// Exit code 0 means every check passed; non-zero means at least one check
// failed or a precondition (missing env var) was not met.

import { RayfinServerClient } from "@microsoft/rayfin-client";
import { randomUUID } from "node:crypto";

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing required environment variable: ${name}`);
        console.error("See the header of this script for the full list of required variables.");
        process.exit(1);
    }
    return value;
}

const apiUrl = requireEnv("RAYFIN_API_URL");
const publishableKey = requireEnv("RAYFIN_PUBLISHABLE_KEY");
const accessToken = requireEnv("RAYFIN_ACCESS_TOKEN");
const honestEmail = requireEnv("VALIDATE_USER_EMAIL");
const spoofedEmail = process.env.VALIDATE_SPOOFED_EMAIL || "spoofed-user@example.invalid";

// A fixed, obviously-test project/task id keeps validation rows easy to spot
// and clean up; it is not treated as a real Lakehouse project.
const VALIDATION_PROJECT_ID = "task-7-7-identity-validation";

const client = new RayfinServerClient({
    baseUrl: apiUrl,
    publishableKey,
    accessToken,
});

function newComment(userUpn, text) {
    return {
        comment_id: randomUUID(),
        project_id: VALIDATION_PROJECT_ID,
        task_id: null,
        user_upn: userUpn,
        // Never log full comment bodies at info level — keep validation text
        // short and non-sensitive; only a redacted preview is printed below.
        comment_text: text,
        created_datetime: new Date(),
    };
}

async function main() {
    console.log(`Validating against ${apiUrl} (project_id=${VALIDATION_PROJECT_ID})`);
    let honestOk = false;
    let spoofedOk = false;

    // 1. Honest create: user_upn matches the caller's own claims.email.
    try {
        const honest = newComment(honestEmail, "task-7.7 honest validation comment");
        const created = await client.data.Comment.create(honest);
        console.log(`✅ Honest create succeeded (comment_id=${created.comment_id ?? honest.comment_id}).`);

        const readBack = await client.data.Comment
            .select(["comment_id", "user_upn"])
            .where({ project_id: { eq: VALIDATION_PROJECT_ID }, comment_id: { eq: honest.comment_id } })
            .execute();
        if (readBack.length === 1 && readBack[0].user_upn === honestEmail) {
            console.log("✅ Honest row read back successfully with the expected user_upn.");
            honestOk = true;
        } else {
            console.error("❌ Honest row could not be read back with the expected user_upn.");
        }
    } catch (err) {
        console.error(`❌ Honest create failed unexpectedly: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 2. Spoofed create: user_upn differs from the caller's own claims.email.
    //    The deployed policy (`claims.email eq item.user_upn`) must reject this.
    try {
        const spoofed = newComment(spoofedEmail, "task-7.7 spoofed validation comment");
        await client.data.Comment.create(spoofed);
        console.error("❌ Spoofed create unexpectedly succeeded — RLS policy is not enforcing identity.");
    } catch (err) {
        console.log(
            `✅ Spoofed create was rejected as expected (${err instanceof Error ? err.message : String(err)}).`,
        );
        spoofedOk = true;
    }

    console.log("\nSummary:");
    console.log(`  Honest insert succeeded:  ${honestOk ? "PASS" : "FAIL"}`);
    console.log(`  Spoofed insert rejected:  ${spoofedOk ? "PASS" : "FAIL"}`);
    console.log("  No secret values were printed above — only script-provided emails and generated ids.");

    if (!honestOk || !spoofedOk) {
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error("Validation script crashed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
