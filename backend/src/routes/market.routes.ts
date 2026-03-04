import { Router } from 'express';
import { getHistory } from '../controllers/market.controller';
import { extractUserTier } from '../middleware/auth.middleware';

const router = Router();

// Apply auth/tier extraction middleware before controller
router.get('/', extractUserTier, getHistory);

export default router;
