import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            userTier?: 'free' | 'premium';
            userId?: string;
        }
    }
}

/**
 * Validates JWT issued by Supabase Auth and attaches tier limits.
 * Will NOT block request if absent, it merely assigns 'free' limits to public unauth requests.
 */
export const extractUserTier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.userTier = 'free';
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            req.userTier = 'free';
            return next();
        }

        req.userId = user.id;

        // Check custom membership tier mapping in Postgres users table
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('membership_type, membership_expires_at')
            .eq('id', user.id)
            .single();

        if (profile && profile.membership_type === 'premium') {
            // Validate expiry
            if (!profile.membership_expires_at || new Date(profile.membership_expires_at) > new Date()) {
                req.userTier = 'premium';
                return next();
            }
        }

        // Default fallback
        req.userTier = 'free';
        next();
    } catch (err) {
        req.userTier = 'free';
        next();
    }
};
