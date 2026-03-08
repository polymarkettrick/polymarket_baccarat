import { Request, Response } from 'express';
import { getMarketHistory } from '../services/market.service';

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const seriesId = req.query.seriesId as string;
        const slug = req.query.slug as string;

        if (!seriesId && !slug) {
            res.status(400).json({ error: 'Missing seriesId or slug query parameter' });
            return;
        }

        const identifier = slug || seriesId;
        const isSlug = !!slug;

        // Auth middleware attaches this safely (defaults to 'free')
        const userTier = req.userTier || 'free';

        const historyResponse = await getMarketHistory(identifier, isSlug, userTier);

        res.status(200).json(historyResponse);
    } catch (error: any) {
        console.error('Controller Error fetching market history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
