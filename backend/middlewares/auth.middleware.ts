import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { JWT_SECRET } from '../config/config.js';
import { extractToken } from '../helpers/auth.helpers.js';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = extractToken(req);

		if (!token) {
			res.status(401).json({
				code: 'NO_TOKEN',
				message: 'Access token required',
			});
			return;
		}

		const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
		const user = await User.findById(decoded.id).select('-password');

		if (!user || !user.isActive) {
			res.status(401).json({
				code: 'USER_NOT_FOUND',
				message: 'User not found or inactive',
			});
			return;
		}

		(req as any).user = user;
		(req as any).userId = user._id.toString();
		next();
	} catch (error: any) {
		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
		};

		res.clearCookie('accessToken', cookieOptions);

		if (error.name === 'TokenExpiredError') {
			res.status(401).json({
				code: 'TOKEN_EXPIRED',
				message: 'Access token expired',
				expired: true,
			});
			return;
		}

		if (error.name === 'JsonWebTokenError') {
			res.status(401).json({
				code: 'INVALID_TOKEN',
				message: 'Invalid access token',
			});
			return;
		}

		res.status(401).json({
			code: 'AUTH_FAILED',
			message: 'Authentication failed',
		});
	}
};

export const authenticateJWTOptional = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = extractToken(req);

		if (token) {
			const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as { id: string };
			const user = await User.findById(decoded.id).select('-password');

			if (user && user.isActive) {
				(req as any).user = user;
				(req as any).userId = user._id.toString();
			}
		}

		next();
	} catch (_error) {
		next();
	}
};

export const checkRole = (roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const user = (req as any).user;
		if (!user) {
			res.status(401).json({ 
				code: 'UNAUTHORIZED',
				message: 'User authentication required' 
			});
			return;
		}
		
		if (!roles.includes(user.role)) {
			res.status(403).json({ 
				code: 'FORBIDDEN',
				message: 'Insufficient permissions for this action' 
			});
			return;
		}
		
		next();
	};
};

/**
 * Middleware to check if the user account has been approved by an administrator.
 * Gating FIX-007.
 */
export const checkApproval = (req: Request, res: Response, next: NextFunction): void => {
	const user = (req as any).user;
	
	if (!user) {
		res.status(401).json({ message: 'Authentication required' });
		return;
	}

	if (!user.isApprovedByAdmin) {
		res.status(403).json({
			code: 'PENDING_APPROVAL',
			message: 'Your account is pending administrator approval. Please contact support.'
		});
		return;
	}

	next();
};
