import express from 'express';
import cors from 'cors';
import marketRoutes from './routes/market.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { supabaseAdmin } from './config/supabase';

const app = express();

// Whitelist Chrome Extension ID for public security
const allowedOrigins = [
    process.env.EXTENSION_URL || 'chrome-extension://my_chrome_ext_id_here'
];

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests) for testing
        // but in strict production, enforce origin matches extension ID or your website
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// Health Check (Keep-Alive Ping for Supabase Free Tier)
app.get('/health', async (req, res) => {
    try {
        // Ping Supabase to reset 7-day inactivity timer
        await supabaseAdmin.from('markets').select('id').limit(1);
        res.status(200).json({ status: 'ok', message: 'Supabase pinged successfully.' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: 'Failed to ping Supabase.' });
    }
});

// Main Routes
app.use('/api/market-history', marketRoutes);
app.use('/api/subscription', subscriptionRoutes);

export default app;
