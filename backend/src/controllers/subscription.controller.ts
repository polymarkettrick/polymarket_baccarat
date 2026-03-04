import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { supabaseAdmin } from '../config/supabase';

export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle successful payments
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.client_reference_id; // Set during window.open in Extension UI

        if (userId) {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Unlock Premium for 1 year

            const { error } = await supabaseAdmin
                .from('users')
                .update({
                    membership_type: 'premium',
                    membership_expires_at: expiresAt.toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('Failed to sync Stripe checkout to Supabase Postgres:', error);
            } else {
                console.log(`[Stripe Webhook] Successfully upgraded user ${userId} to Premium.`);
            }
        }
    }

    res.status(200).json({ received: true });
};
