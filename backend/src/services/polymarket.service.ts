import crypto from 'crypto';
import { IMarket, IResolution } from '../../../../packages/shared/src/types';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

/**
 * Fetches market history and resolutions aggregated by series_id from Polymarket Gamma API.
 * Uses pagination to ensure we get enough data to stitch together 50 periods.
 */
export async function fetchPolymarketSeries(seriesId: string, limit: number = 50): Promise<{
    markets: IMarket[],
    resolutions: IResolution[]
}> {
    const allMarkets: any[] = [];
    let offset = 0;
    const BATCH_SIZE = 100;

    // We fetch until we have enough *resolved* markets to satisfy the limit, or we run out of paginated results
    while (true) {
        const url = `${GAMMA_API_BASE}/markets?series_id=${seriesId}&limit=${BATCH_SIZE}&offset=${offset}&order=id&ascending=false`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Gamma API returned ${response.status}`);
            }

            const data = await response.json();
            if (!data || data.length === 0) break;

            allMarkets.push(...data);

            if (data.length < BATCH_SIZE) break;
            offset += BATCH_SIZE;

            // Anti-spam delay to respect public rate limits
            await new Promise(r => setTimeout(r, 200));
        } catch (error) {
            console.error(`Error fetching from Gamma API for series ${seriesId}:`, error);
            break;
        }
    }

    const markets: IMarket[] = [];
    const resolutions: IResolution[] = [];

    for (const apiMarket of allMarkets) {
        // Attempt to extract timeframe dynamically
        let timeframe = '1d';
        if (apiMarket.title) {
            const t = apiMarket.title.toLowerCase();
            if (t.includes('5m') || t.includes('5 minute')) timeframe = '5m';
            else if (t.includes('15m') || t.includes('15 minute')) timeframe = '15m';
            else if (t.includes('hourly') || t.includes('1h')) timeframe = '1h';
            else if (t.includes('4h')) timeframe = '4h';
            else if (t.includes('weekly')) timeframe = '1w';
        }

        // Attempt to extract labels
        let labels = ["Yes", "No"]; // Default Casino Colors
        if (apiMarket.outcomes && Array.isArray(apiMarket.outcomes) && apiMarket.outcomes.length >= 2) {
            // e.g., ["Up", "Down"] or ["Biden", "Trump", "Other"] -> only take first two for binary mapping
            labels = [apiMarket.outcomes[0], apiMarket.outcomes[1]];
        }

        // Basic normalization
        const market: IMarket = {
            id: apiMarket.id,
            title: apiMarket.question || apiMarket.title || 'Untitled Market',
            category: apiMarket.category || 'Unknown',
            market_type: apiMarket.market_type || 'binary',
            series_id: seriesId,
            timeframe,
            labels
        };
        markets.push(market);

        // If it's resolved, process the resolution
        // Gamma uses 'closed' boolean or 'active' status + 'end_date_iso' / resolution outcome
        if (apiMarket.closed && apiMarket.end_date_iso) {
            // Determine binary outcome (Assume 'Yes' == true)
            // Usually polymorphic, if tokens exist, it's boolean mapped.
            const isYesOutcome = apiMarket.outcome === 'Yes' || apiMarket.outcome === true;

            // Source hash to detect malicious edits or retroactive dispute resolutions
            const rawPayload = JSON.stringify(apiMarket);
            const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

            resolutions.push({
                id: `res_${apiMarket.id}`,
                market_id: apiMarket.id,
                series_id: seriesId,
                outcome: isYesOutcome,
                resolved_at: new Date(apiMarket.end_date_iso).toISOString(), // Parse to guarantee UTC ISO 8601
                source_hash: hash
            });
        }
    }

    // Sort resolutions strictly by resolved_at descending to get the most recent periods first
    resolutions.sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime());

    return {
        markets,
        resolutions: resolutions.slice(0, Math.max(limit, 50)) // Always fetch at least 50 if storing
    };
}
