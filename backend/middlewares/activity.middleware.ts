import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import {
	shouldExtendRefreshWindow,
	generateAccessAndRefreshTokens,
} from '../helpers/auth.helpers.js';

export const trackUserActivity = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	// Only track for authenticated requests
	if ((req as any).user && (req as any).user.id) {
		try {
			// Update user's last activity
			await User.findByIdAndUpdate((req as any).user.id, {
				lastActivity: new Date(),
			});

			// Check if we should extend any refresh tokens for this user
			const refreshToken = req.cookies?.refreshToken;
			if (refreshToken) {
				const refreshTokenRecord = await RefreshToken.findOne({
					token: refreshToken,
					userId: (req as any).user.id,
					isActive: true,
				});

				if (
					refreshTokenRecord &&
					shouldExtendRefreshWindow(refreshTokenRecord)
				) {
					// Silently extend the sliding window in the background
					await generateAccessAndRefreshTokens(
						(req as any).user.id,
						req,
						true,
						refreshTokenRecord._id,
					);
				}
			}
		} catch (error) {
			console.error('Error tracking user activity:', error);
			// Don't break the request if activity tracking fails
		}
	}

	next();
};
