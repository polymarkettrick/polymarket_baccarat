import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/subscription.controller';

const router = Router();

// Stripe requires the raw, unparsed body to cryptographically verify signatures
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
