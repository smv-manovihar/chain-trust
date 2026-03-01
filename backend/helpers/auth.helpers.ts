import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import User from '../models/user.model.js';
import RefreshToken, { IRefreshToken } from '../models/refreshToken.model.js';
import {
	JWT_SECRET,
	JWT_ACCESS_EXPIRATION,
	SLIDING_WINDOW_MS,
	EXTEND_WINDOW_MS,
	INACTIVITY_TIMEOUT_MS,
} from '../config/config.js';
import { Types } from 'mongoose';

export const extractToken = (req: Request): string | undefined => {
	const auth = req.headers.authorization;
	if (auth?.startsWith('Bearer ')) {
		return auth.slice(7).trim();
	}
	return req.cookies?.accessToken;
};

export const extractRefreshToken = (req: Request): string | undefined => {
	if (req.cookies?.refreshToken) return req.cookies.refreshToken;
	if (req.body?.refreshToken) return req.body.refreshToken;
	if (req.query?.refreshToken) return req.query.refreshToken as string;

	const headerToken =
		req.headers['x-refresh-token'] || req.headers['x-refreshtoken'];
	if (typeof headerToken === 'string' && headerToken.trim()) {
		return headerToken.trim();
	}

	const authHeader = req.headers.authorization;
	if (authHeader?.startsWith('Refresh ')) {
		return authHeader.slice('Refresh '.length).trim();
	}

	return undefined;
};

const generateDeviceInfo = (req: Request) => {
	const userAgent = req.headers['user-agent'] || '';
	const ipAddress =
		req.ip ||
		req.headers['x-forwarded-for']?.toString() ||
		'';

	const deviceId = Buffer.from(userAgent + ipAddress)
		.toString('base64')
		.slice(0, 20);

	return {
		userAgent,
		ipAddress,
		deviceId,
		deviceName: parseDeviceName(userAgent),
	};
};

const parseDeviceName = (userAgent: string): string => {
	if (userAgent.includes('iPhone')) return 'iPhone';
	if (userAgent.includes('iPad')) return 'iPad';
	if (userAgent.includes('Android')) return 'Android Device';
	if (userAgent.includes('Windows')) return 'Windows PC';
	if (userAgent.includes('Macintosh')) return 'Mac';
	if (userAgent.includes('Chrome')) return 'Chrome Browser';
	if (userAgent.includes('Safari')) return 'Safari Browser';
	if (userAgent.includes('Firefox')) return 'Firefox Browser';
	if (userAgent.includes('Edge')) return 'Edge Browser';
	return 'Unknown Device';
};

export interface TokenResult {
	accessToken: string;
	refreshToken: string;
	refreshTokenId: Types.ObjectId;
	expiresAt: Date;
}

export const generateAccessAndRefreshTokens = async (
	userId: Types.ObjectId | string,
	req: Request,
	extendExisting = false,
	existingTokenId: Types.ObjectId | null = null,
): Promise<TokenResult> => {
	try {
		const user = await User.findById(userId);
		if (!user) {
			throw new Error('User not found');
		}

		const accessToken = jwt.sign(
			{ id: userId.toString(), role: user.role }, 
			JWT_SECRET, 
			{ expiresIn: JWT_ACCESS_EXPIRATION }
		);

		let refreshTokenRecord: IRefreshToken | null = null;
		const deviceInfo = generateDeviceInfo(req);
		const expiresAt = new Date(Date.now() + SLIDING_WINDOW_MS);

		if (extendExisting && existingTokenId) {
			refreshTokenRecord = await RefreshToken.findById(existingTokenId);
			if (
				refreshTokenRecord &&
				refreshTokenRecord.userId.toString() === userId.toString()
			) {
				refreshTokenRecord.expiresAt = expiresAt;
				refreshTokenRecord.lastUsed = new Date();

				const newRefreshTokenValue = jwt.sign(
					{
						id: userId.toString(),
						deviceId: deviceInfo.deviceId,
						tokenId: refreshTokenRecord._id.toString(),
						exp: Math.floor(expiresAt.getTime() / 1000),
					},
					JWT_SECRET,
				);

				refreshTokenRecord.token = newRefreshTokenValue;
				await refreshTokenRecord.save();
			}
		}

		if (!refreshTokenRecord) {
			const refreshTokenValue = jwt.sign(
				{
					id: userId.toString(),
					deviceId: deviceInfo.deviceId,
					exp: Math.floor(expiresAt.getTime() / 1000),
				},
				JWT_SECRET,
			);

			refreshTokenRecord = await RefreshToken.findOneAndUpdate(
				{
					userId,
					'deviceInfo.deviceId': deviceInfo.deviceId,
					isActive: true,
				},
				{
					token: refreshTokenValue,
					expiresAt,
					deviceInfo,
					lastUsed: new Date(),
				},
				{
					upsert: true,
					new: true,
					setDefaultsOnInsert: true,
				},
			);
		}

		// Clean up expired tokens
		await RefreshToken.deleteMany({
			userId,
			expiresAt: { $lt: new Date() },
		});

		await User.findByIdAndUpdate(userId, { lastActivity: new Date() });

		return {
			accessToken,
			refreshToken: refreshTokenRecord!.token,
			refreshTokenId: refreshTokenRecord!._id,
			expiresAt: refreshTokenRecord!.expiresAt,
		};
	} catch (error: any) {
		throw new Error('Error generating tokens: ' + error.message);
	}
};

export const shouldExtendRefreshWindow = (refreshTokenRecord: IRefreshToken): boolean => {
	if (!refreshTokenRecord.expiresAt) return true;

	const now = new Date();
	const timeUntilExpiry =
		refreshTokenRecord.expiresAt.getTime() - now.getTime();

	return timeUntilExpiry <= EXTEND_WINDOW_MS;
};

export const attachTokens = (accessToken: string, refreshToken: string, res: Response) => {
	const cookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
	};

	res.cookie('accessToken', accessToken, {
		...cookieOptions,
		maxAge: 15 * 60 * 1000,
	});

	res.cookie('refreshToken', refreshToken, {
		...cookieOptions,
		maxAge: INACTIVITY_TIMEOUT_MS,
	});

	res.setHeader('Authorization', `Bearer ${accessToken}`);

	return { accessToken, refreshToken };
};

export const attachToken = (userId: string, role: string, res: Response): string => {
	const token = jwt.sign({ id: userId, role }, JWT_SECRET, {
		expiresIn: JWT_ACCESS_EXPIRATION,
	});

	res.cookie('accessToken', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
		maxAge: 15 * 60 * 1000,
	});

	res.setHeader('Authorization', `Bearer ${token}`);
	return token;
};
