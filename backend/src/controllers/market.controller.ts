import { Request, Response } from 'express';
import { getMarketHistory } from '../services/market.service';

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const seriesId = req.query.seriesId as string;

        if (!seriesId) {
            res.status(400).json({ error: 'Missing seriesId query parameter' });
            return;
        }

        // Auth middleware attaches this safely (defaults to 'free')
        const userTier = req.userTier || 'free';

        const historyResponse = await getMarketHistory(seriesId, userTier);

        res.status(200).json(historyResponse);
    } catch (error: any) {
        console.error('Controller Error fetching market history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
