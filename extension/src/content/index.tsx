import React from 'react';
import { createRoot } from 'react-dom/client';
import { BaccaratBoard } from './components/BaccaratBoard';
import appCss from './App.css?inline';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error('[Baccarat Extension] React Error Boundary Caught:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return <div style={{ background: 'red', color: 'white', padding: '20px', position: 'fixed', top: 0, right: 0, zIndex: 999999 }}>Extension Crashed: {this.state.error?.message}</div>;
        }
        return this.props.children;
    }
}

// 1. Mock Data Injection for UI Testing
const MockHistory = [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0];

function getEventSlugFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const match = urlObj.pathname.match(/^\/event\/([^\/]+)/);
        return match ? match[1] : null;
    } catch (e) {
        return null; // Fallback for invalid URLs
    }
}

let activeRoot: any = null;

// 2. Shadow DOM Wrapper & Injection
function injectApp() {
    if (!document.body) {
        console.warn('[Baccarat Extension] document.body not found, deferring injection.');
        return;
    }

    const containerId = 'polymarket-baccarat-root';
    let container = document.getElementById(containerId);

    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container); // Overlay injected into body

        const shadow = container.attachShadow({ mode: 'closed' });

        const style = document.createElement('style');
        style.textContent = appCss; // Injecting CSS as raw string correctly
        shadow.appendChild(style);

        const rootElement = document.createElement('div');
        shadow.appendChild(rootElement);

        activeRoot = createRoot(rootElement);
    }

    renderApp();
}

function renderApp() {
    if (!activeRoot) return;

    // Mock Metadata for Local Testing UI
    const mockTimeframe = '1d';
    const mockLabels = ['Up', 'Down']; // Testing Crypto Theme
    const eventSlug = getEventSlugFromUrl(window.location.href);

    activeRoot.render(
        <ErrorBoundary>
            <BaccaratBoard
                loading={false}
                error={null}
                history={MockHistory}
                timeframe={mockTimeframe}
                labels={mockLabels}
                eventSlug={eventSlug}
            />
        </ErrorBoundary>
    );
}

// 3. SPA Lifecycle Manager using MutationObserver
let lastHref = document.location.href;

const observer = new MutationObserver(() => {
    if (lastHref !== document.location.href) {
        lastHref = document.location.href;
        console.log('[Baccarat Extension] URL changed to:', lastHref);
        // Ensure UI updates with new URL
        renderApp();
    }
});

// Added null safety for MutationObserver startup
if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectApp);
} else {
    injectApp();
}

// 4. Chrome Service Worker Bridge
// Receives commands from background.ts regarding SPA route changes & Pro upgrades
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'URL_CHANGED') {
            console.log('[Baccarat Extension] Force Refresh URL Triggered:', message.url);
            injectApp(); // Idempotent remount validation
            // Here you would subsequently trigger the internal backend fetch for new data
        } else if (message.type === 'UPGRADE_SUCCESS') {
            console.log('[Baccarat Extension] Premium Unlocked! Re-fetching larger datasets.');
            // Force UI Loading State + Refetch
        }
    });
}
