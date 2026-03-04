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
