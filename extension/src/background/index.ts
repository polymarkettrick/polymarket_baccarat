import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy';

// MV3 Stateless wakeup compliant Supabase client
const getSupabase = () => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: {
                getItem: (key) => new Promise((resolve) => {
                    chrome.storage.local.get([key], (result) => resolve((result[key] as string) || null));
                }),
                setItem: (key, value) => new Promise((resolve) => {
                    chrome.storage.local.set({ [key]: value }, () => resolve());
                }),
                removeItem: (key) => new Promise((resolve) => {
                    chrome.storage.local.remove([key], () => resolve());
                }),
            },
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
};

// 1. Detect SPA Navigation
// Triggers when Polymarket React router pushes a new history state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('polymarket.com')) {
        chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: tab.url }).catch(() => {
            // Catch if content script is not yet mounted in DOM natively
        });
    }
});


// 2. Extension Icon Click (Toggle Board natively)
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.storage.local.get(['polyBoardEnabled'], (res) => {
            const nextState = !res.polyBoardEnabled;
            chrome.storage.local.set({ polyBoardEnabled: nextState });
        });
    }
});

// 4. The "Magic Upgrade" Listener (Stripe Webhook Success)
// Reacts when the Web App successfully finishes a Stripe Checkout and redirects home
chrome.runtime.onMessageExternal.addListener((request, _sender, sendResponse) => {
    if (request.type === 'UPGRADE_SUCCESS') {
        console.log('[Background] Upgrade Success recognized. Firing refresh payloads.');

        // Force Supabase Auth state to sync from storage instantly
        const supabase = getSupabase();
        supabase.auth.getSession().then(() => {

            // Ping all active Polymarket tabs to re-render taking 50-limit advantage
            chrome.tabs.query({ url: "*://*.polymarket.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'UPGRADE_SUCCESS' });
                    // Also broadcast AUTH_STATE_CHANGED for full sync
                    if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'AUTH_STATE_CHANGED' });
                });
            });

        });

        sendResponse({ success: true, message: "Extension upgraded session" });
    }
});

// 5. Google OAuth Flow Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GOOGLE_OAUTH') {
        const supabase = getSupabase();

        const extensionRedirectUrl = chrome.identity.getRedirectURL();
        console.log("[Background] Initiating Google OAuth Flow with Redirect URI:", extensionRedirectUrl);

        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: extensionRedirectUrl,
                skipBrowserRedirect: true
            }
        }).then(({ data, error }) => {
            if (error || !data?.url) {
                console.error("[Background] Supabase OAuth URL generation failed", error);
                sendResponse({ error: error?.message || "OAuth URL generation failed" });
                return;
            }

            chrome.identity.launchWebAuthFlow({
                url: data.url,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError || !redirectUrl) {
                    console.error("[Background] WebAuthFlow Failed:", chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError?.message || "Google Flow Cancelled or Blocked." });
                    return;
                }

                // Supabase returns the session directly in the URL hash fragment
                const currentUrl = new URL(redirectUrl);
                const hashParams = new URLSearchParams(currentUrl.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    }).then(({ data: sessionData, error: sessionError }) => {
                        if (sessionError) {
                            sendResponse({ error: sessionError.message });
                        } else {
                            // Sync the final session object down into chrome.storage.local
                            // so the Content Script automatically picks it up via onAuthStateChange
                            sendResponse({ success: true, email: sessionData.session?.user.email });
                            // Broadcast auth state change manually to ping active tabs
                            chrome.tabs.query({ url: "*://*.polymarket.com/*" }, (tabs) => {
                                tabs.forEach(t => t.id && chrome.tabs.sendMessage(t.id, { type: 'AUTH_STATE_CHANGED' }));
                            });
                        }
                    });
                } else {
                    const errDesc = hashParams.get('error_description') || "Missing tokens from Google redirect. Make sure Google is enabled in Supabase and your Extension Redirect URL is whitelisted!";
                    sendResponse({ error: errDesc });
                }
            });
        });

        // Tell Chrome we will sendResponse asynchronously
        return true;
    }
});
