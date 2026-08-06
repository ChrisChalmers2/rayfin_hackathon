//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { ErrorBoundary } from "react-error-boundary";

import App from "./App";
import { AuthGate } from "./components/auth-gate.component";
import { ThemeContext } from "./hooks/theme.context";
import { AuthProvider } from "./hooks/use-auth";
import { useAppTheme } from "./hooks/use-theme";
import { ErrorFallback } from "./ErrorFallback";
import { bootstrapAuth } from "./services/rayfin-auth.service";

const rayfinAuthService = bootstrapAuth();

export function Root() {
    const { isDark, toggleTheme } = useAppTheme();

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AuthProvider rayfinAuthService={rayfinAuthService}>
                    <AuthGate>
                        <App />
                    </AuthGate>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeContext.Provider>
    );
}
