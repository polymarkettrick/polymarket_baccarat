import { redisClient } from '../config/redis';
import { supabaseAdmin } from '../config/supabase';
import { fetchPolymarketSeries } from './polymarket.service';
import { BaccaratHistoryResponse } from '../../../packages/shared/src/types';

export async function resolveSlugToSeriesId(slug: string): Promise<string> {
    const slugCacheKey = `slug:${slug}`;
    if (redisClient.isOpen) {
        const cachedSeriesId = await redisClient.get(slugCacheKey);
        if (cachedSeriesId) return cachedSeriesId;
    }

    const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
    if (!res.ok) throw new Error("Failed to fetch event data from Polymarket API.");
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Event not found on Polymarket.");
    }

    // We get the first market inside the event to grab the series metadata
    const mainMarket = data[0].markets?.[0];
    if (!mainMarket) throw new Error("No markets found for this event.");

    const seriesId = mainMarket.groupItemTitle || mainMarket.seriesId || data[0].seriesSlug;
    if (!seriesId) throw new Error("Could not resolve seriesId from the event data.");

    if (redisClient.isOpen) {
        // Cache this slug -> seriesId mapping for 24 hours to deeply minimize API calls
        await redisClient.setEx(slugCacheKey, 86400, seriesId);
    }

    return seriesId;
}

export async function getMarketHistory(
    identifier: string,
    isSlug: boolean,
    userTier: 'free' | 'premium'
): Promise<BaccaratHistoryResponse> {
    const limit = userTier === 'premium' ? 50 : 10;

    // Resolve slug if needed
    let seriesId = identifier;
    if (isSlug) {
        seriesId = await resolveSlugToSeriesId(identifier);
    }

    // 1. Check Redis Cache
    const cacheKey = `history:${seriesId}`;
    if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                limit,
                data: parsed.data.slice(0, limit) // Enforce explicit tier limits mapping correctly
            };
        }
    }

    // 2. Check Database Check
    const { data: dbResolutions, error } = await supabaseAdmin
        .from('resolutions')
        .select('id, outcome, resolved_at')
        .eq('series_id', seriesId)
        .order('resolved_at', { ascending: false })
        .limit(50);

    // Fetch Parent Market Metadata for UI coloring
    const { data: parentMarket } = await supabaseAdmin
        .from('markets')
        .select('timeframe, labels')
        .eq('series_id', seriesId)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(`DB Error querying history for series ${seriesId}:`, error.message);
    }

    let finalData = dbResolutions || [];

    // Need minimum 50 periods. If it's less, trigger Gamma API
    if (finalData.length < 50) {

        // 3. Apply Redis Distributed Fetch Lock
        let lockAcquired = false;
        const lockKey = `lock:fetch:${seriesId}`;

        if (redisClient.isOpen) {
            // 10-sec distributed lock. NX only sets if missing.
            lockAcquired = await redisClient.set(lockKey, 'locked', { NX: true, EX: 10 }) !== null;
        }

        if (lockAcquired) {
            try {
                const { markets, resolutions } = await fetchPolymarketSeries(seriesId, 50);

                // Push resolved events back to postgres via Upsert
                if (markets.length > 0) {
                    await supabaseAdmin.from('markets').upsert(markets, { onConflict: 'id' });
                }
                if (resolutions.length > 0) {
                    await supabaseAdmin.from('resolutions').upsert(resolutions, { onConflict: 'market_id, id' });
                    finalData = resolutions.map(r => ({
                        id: r.id,
                        outcome: r.outcome,
                        resolved_at: r.resolved_at
                    }));
                }
            } finally {
                if (redisClient.isOpen) {
                    await redisClient.del(lockKey);
                }
            }
        } else {
            // Fetch lock rejected dual calls -> Fallback gracefully to DB returning what already exists
            console.log(`Fetch limit locked for series ${seriesId}. Gracefully defaulting to db snapshot.`);
        }
    }

    finalData.sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime());

    const responsePayload = {
        seriesId,
        limit: 50,  // Cache stores max items possible
        totalAvailable: finalData.length,
        timeframe: parentMarket?.timeframe || '1d',
        labels: parentMarket?.labels || ["Yes", "No"],
        data: finalData.map(d => ({
            resolutionId: d.id,
            outcome: d.outcome,
            resolvedAt: d.resolved_at
        })),
        isStale: finalData.length === 0
    };

    // 4. Update Redis Hot Cache with 5 minute TTL (300 secs)
    if (redisClient.isOpen && responsePayload.data.length > 0) {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(responsePayload));
    }

    // 5. Slice response to User Membership Auth limits
    return {
        ...responsePayload,
        limit,
        data: responsePayload.data.slice(0, limit)
    };
}
