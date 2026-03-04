export interface UserTier {
    membershipType: 'free' | 'premium';
    expiresAt?: string;
}

export interface IMarket {
    id: string; // Polymarket ID
    title: string;
    category: string;
    market_type: string;
    series_id: string; // Grouping ID for series logic to fetch 50 periods
    timeframe?: string;
    labels?: string[];
}

export interface IResolution {
    id: string; // Resolution event id from API
    market_id: string;
    series_id: string; // Denormalized for rapid querying
    outcome: boolean; // true = YES, false = NO
    resolved_at: string;
    source_hash: string;
}

export interface BaccaratHistoryResponse {
    seriesId: string;
    limit: number;
    totalAvailable: number;
    timeframe: string;
    labels: string[];
    data: {
        resolutionId: string;
        outcome: boolean;
        resolvedAt: string;
    }[];
    isStale: boolean;
}
