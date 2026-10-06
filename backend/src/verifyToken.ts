import type { Request, Response, NextFunction } from 'express';
import { supabase } from './supabaseClient.js';
import type { User } from '@supabase/supabase-js';

// Extend Express Request interface to include the user
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Token missing from Authorization header' });
        return;
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            res.status(401).json({ error: 'Unauthorized: Invalid token' });
            return;
        }

        req.user = data.user;
        next();
    } catch {
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
