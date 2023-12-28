// Required for the core webserver integration to work
import 'vite/modulepreload-polyfill'

import { ErrorBoundary } from "react-error-boundary";
import ReactDOM from 'react-dom/client'
import './globals.css'

import MainShell from './layout/MainShell.tsx'
import { AppErrorFallback } from './components/ErrorFallback.tsx';
import { logoutWatcher, useIsAuthenticated } from './hooks/auth.ts';
import AuthShell from './layout/AuthShell.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isValidRedirectPath } from './lib/utils.ts';
import ThemeProvider from './components/ThemeProvider.tsx';
import { StrictMode } from 'react';
import { isMobile } from 'is-mobile';
import { useAtomValue } from 'jotai';
import { pageTitleWatcher } from './hooks/pages.ts';
import { TooltipProvider } from './components/ui/tooltip.tsx';

//Detecting if the user is on a mobile device
try {
    window.txIsMobile = isMobile({ tablet: true });
} catch (error) {
    window.txIsMobile = false;
}

//If the initial routing is from WebPipe, remove it from the pathname so the router can handle it
if (window.location.pathname.substring(0, 8) === '/WebPipe') {
    console.info('Removing WebPipe prefix from the pathname.');
    const newUrl = window.location.pathname.substring(8) + window.location.search + window.location.hash;
    window.history.replaceState(null, '', newUrl);
}

//Rendering auth or main pages depending on if the user is authenticated
const authRoutePrefixes = ['/login', '/addMaster'];
const isAuthRoute = (pathname: string) => {
    return authRoutePrefixes.some(prefix => pathname.startsWith(prefix));
}

export function AuthContextSwitch() {
    useAtomValue(logoutWatcher);
    useAtomValue(pageTitleWatcher);
    const isAuthenticated = useIsAuthenticated();

    if (isAuthenticated) {
        //Replace the current URL with the redirect path if it exists and is valid
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('r');
        if (redirectPath) {
            if (isValidRedirectPath(redirectPath)) {
                window.history.replaceState(null, '', redirectPath as string);
            } else {
                window.history.replaceState(null, '', '/');
            }
        } else if (isAuthRoute(window.location.pathname)) {
            window.history.replaceState(null, '', '/');
        }

        return <MainShell />;
    } else {
        //Unless the user is already in the auth pages, redirect to the login page
        if (!window.txConsts.hasMasterAccount && !window.location.pathname.startsWith('/addMaster')) {
            console.log('No master account detected. Redirecting to addMaster page.');
            window.history.replaceState(null, '', '/addMaster/pin');
        } else if (!isAuthRoute(window.location.pathname)) {
            console.log('User is not authenticated. Redirecting to login page.');
            const suffix = window.location.pathname + window.location.search + window.location.hash;
            const newSuffix = suffix === '/'
                ? `/login`
                : `/login?r=${encodeURIComponent(suffix)}`;
            window.history.replaceState(null, '', newSuffix);
        }

        return <AuthShell />;
    }
}

//Creating a global query client
const queryClient = new QueryClient();


ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <TooltipProvider delayDuration={300} disableHoverableContent={true}>
                        <AuthContextSwitch />
                    </TooltipProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    </StrictMode>,
)
