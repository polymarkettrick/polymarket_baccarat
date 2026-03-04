import { supabaseAdmin } from '../config/supabase';
import { fetchPolymarketSeries } from '../services/polymarket.service';

/**
 * Runs every 6 hours.
 * Checks resolutions from the last 3 days to catch malicious API edits or dispute overturns.
 */
export async function disputeCheckJob() {
    console.log('[Dispute Check Job] Starting...');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Find series that had resolutions in the last 3 days
    const { data: recentResolutions, error } = await supabaseAdmin
        .from('resolutions')
        .select('series_id, id, source_hash')
        .gte('resolved_at', threeDaysAgo);

    if (error || !recentResolutions) {
        console.error('[Dispute Check Job] Error fetching recent resolutions:', error?.message);
        return;
    }

    const uniqueSeries = Array.from(new Set(recentResolutions.map(r => r.series_id)));
    let correctionsMade = 0;

    for (const seriesId of uniqueSeries) {
        try {
            const { resolutions: freshResolutions } = await fetchPolymarketSeries(seriesId, 50);

            // Compare Hashes to detect edits
            for (const fresh of freshResolutions) {
                const matchingDbRecord = recentResolutions.find(r => r.id === fresh.id);
                if (matchingDbRecord && matchingDbRecord.source_hash !== fresh.source_hash) {
                    // It changed! Someone edited Polymarket's data or a dispute overturned it.
                    await supabaseAdmin.from('resolutions').upsert(fresh, { onConflict: 'market_id, id' });
                    correctionsMade++;
                    console.log(`[Dispute Check Job] Hash mismatch! Corrected resolution ${fresh.id}`);
                }
            }
        } catch (err) {
            console.error(`[Dispute Check Job] Failed to check series ${seriesId}`);
        }
    }

    console.log(`[Dispute Check Job] Completed. Made ${correctionsMade} corrections.`);
}

export const startDisputeCheck = () => {
    // Run every 6 hours
    setInterval(disputeCheckJob, 6 * 60 * 60 * 1000);
};
