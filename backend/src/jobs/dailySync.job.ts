import { supabaseAdmin } from '../config/supabase';
import { fetchPolymarketSeries } from '../services/polymarket.service';

/**
 * Generic sync function for a specific array of timeframes
 */
async function syncTimeframes(timeframes: string[], jobName: string) {
    console.log(`[${jobName}] Starting sync for timeframes: ${timeframes.join(', ')}`);

    // Find Active series matching these timeframes
    const { data: markets, error } = await supabaseAdmin
        .from('markets')
        .select('series_id')
        .in('timeframe', timeframes)
        // In a real app, you'd also filter by status = 'active' here if you indexed it
        .limit(200);

    if (error || !markets) {
        console.error(`[${jobName}] Error fetching target series:`, error?.message);
        return;
    }

    const uniqueSeries = Array.from(new Set(markets.map(m => m.series_id)));
    let updatedCount = 0;

    for (const seriesId of uniqueSeries) {
        try {
            const { markets: updatedMarkets, resolutions } = await fetchPolymarketSeries(seriesId, 50);

            if (updatedMarkets.length > 0) {
                await supabaseAdmin.from('markets').upsert(updatedMarkets, { onConflict: 'id' });
            }
            if (resolutions.length > 0) {
                await supabaseAdmin.from('resolutions').upsert(resolutions, { onConflict: 'market_id, id' });
            }

            updatedCount++;
        } catch (err) {
            console.error(`[${jobName}] Failed to sync ${seriesId}`);
        }
    }

    console.log(`[${jobName}] Completed. Synced ${updatedCount} series.`);
}

export const startTieredSyncJobs = () => {
    // Tier 1: High Frequency (Every 1 minute) -> 5m, 15m
    setInterval(() => syncTimeframes(['5m', '15m'], 'Tier 1 Sync'), 1 * 60 * 1000);

    // Tier 2: Mid Frequency (Every 15 minutes) -> 1h, 4h
    setInterval(() => syncTimeframes(['1h', '4h'], 'Tier 2 Sync'), 15 * 60 * 1000);

    // Tier 3: Low Frequency (Every 24 hours) -> 1d, 1w, 1m
    setInterval(() => syncTimeframes(['1d', '1w', '1m', 'Unknown'], 'Tier 3 Sync'), 24 * 60 * 60 * 1000);
};
