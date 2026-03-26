import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import User, { IUser } from '../models/user.model.js';
import Company from '../models/company.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import CabinetItem from '../models/cabinet.model.js';
import Product from '../models/product.model.js';
import Batch from '../models/batch.model.js';
import {
	FRONTEND_URL,
	JWT_SECRET,
	OTP_EXPIRY_MINUTES,
	VERIFICATION_TOKEN_EXPIRY_HOURS,
} from '../config/config.js';
import {
	generateAccessAndRefreshTokens,
	attachTokens,
	extractRefreshToken,
	shouldExtendRefreshWindow,
} from '../helpers/auth.helpers.js';
import { getUserByEmail } from '../utils/user.utils.js';
import {
	generateOTP,
	generateVerificationToken,
	sendEmailVerification,
} from '../utils/email.utils.js';

import { OAuth2Client } from 'google-auth-library';

interface GoogleUserInfo {
	email: string;
	name?: string;
	picture?: string;
	sub: string;
	email_verified?: boolean;
}

interface PublicUser {
	id: string;
	email: string;
	name: string;
	role: string;
	hasPassword: boolean;
	lastActivity: Date;
	isEmailVerified: boolean;
	mustChangePassword: boolean;
	avatar: string | null;
}

const publicUser = (u: IUser): PublicUser => ({
	id: u._id.toString(),
	email: u.email,
	name: u.name,
	role: u.role,
	hasPassword: !!u.password,
	lastActivity: u.lastActivity,
	isEmailVerified: u.isEmailVerified,
	mustChangePassword: u.mustChangePassword,
	avatar: u.avatar,
});

// Google OAuth (server-side redirect flow)
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
	try {
		const { returnTo } = req.query;
		const oauth2Client = new OAuth2Client(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_CALLBACK_URL,
		);

		const scopes = [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email',
		];

		const url = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			prompt: 'consent',
			state: returnTo as string, // Pass returnTo as state
		});

		res.redirect(url);
	} catch (err) {
		console.error('Google auth error:', err);
		res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
	}
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
	const { code } = req.query;

	if (!code) {
		res.redirect(`${FRONTEND_URL}/login?error=no_code`);
		return;
	}

	try {
		const oauth2Client = new OAuth2Client(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_CALLBACK_URL,
		);

		const { tokens } = await oauth2Client.getToken({ code: code as string });

		const userInfoRes = await fetch(
			'https://www.googleapis.com/oauth2/v3/userinfo',
			{
				headers: { Authorization: `Bearer ${tokens.access_token}` },
			},
		);

		if (!userInfoRes.ok) {
			throw new Error('Failed to fetch user info');
		}

		const userInfo = (await userInfoRes.json()) as GoogleUserInfo;

		if (!userInfo.email) {
			throw new Error('No email provided by Google');
		}

		let user = await User.findOne({ email: userInfo.email.toLowerCase() });

		const getHighResAvatar = (url: string | undefined): string | null => {
			if (!url) return null;
			return url.replace(/=s\d+(-c)?$/, '=s512-c');
		};

		if (user) {
			// If user exists but linked to different provider, allow linking if currently 'local'
			if (user.provider !== 'google') {
				user.provider = 'google';
				user.providerId = userInfo.sub;
			} else if (user.providerId !== userInfo.sub) {
				res.redirect(
					`${FRONTEND_URL}/register?error=provider_mismatch`,
				);
				return;
			}
			if (userInfo.picture && user.avatar !== getHighResAvatar(userInfo.picture))
				user.avatar = getHighResAvatar(userInfo.picture);
			if (userInfo.name && user.name !== userInfo.name)
				user.name = userInfo.name;
			
			// If user was invited but logs in via Google, activate them if emails match
			if (user.isInvited) {
				user.isActive = true;
				user.isEmailVerified = true;
				user.isInvited = false;
				user.emailVerificationOtp = null;
			}
			
			await user.save();
		} else {
			// Check for company domain
			const emailDomain = userInfo.email.split('@')[1];
			const company = await Company.findOne({ domain: emailDomain });
			
			user = new User({
				email: userInfo.email.toLowerCase(),
				name: userInfo.name || 'User',
				role: company ? 'employee' : 'customer', // Default to employee if company match, else customer
				companyId: company?._id,
				companyPolicies: company ? company.policies : {},
				provider: 'google',
				providerId: userInfo.sub,
				avatar: getHighResAvatar(userInfo.picture),
				isEmailVerified: userInfo.email_verified === true,
				isActive: true,
			});

			await user.save();
			
			// If new user and NO company match, default to customer and proceed to dashboard
			if (!company) {
				const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, req);
				attachTokens(accessToken, refreshToken, res);
				res.redirect(`${FRONTEND_URL}/customer`);
				return;
			}
		}

		const { accessToken, refreshToken } =
			await generateAccessAndRefreshTokens(user._id, req);
		attachTokens(accessToken, refreshToken, res);

		// Redirect back to state (returnTo) or default dashboard
		const redirectPath = (req.query.state as string) || (user.role === 'manufacturer' ? '/manufacturer' : '/customer');
		res.redirect(`${FRONTEND_URL}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`);
	} catch (err) {
		console.error('Google callback error:', err);
		res.redirect(`${FRONTEND_URL}/login?error=callback_failed`);
	}
};

// Google login with client-side token (for frontend @react-oauth/google)
export const googleLoginWithToken = async (req: Request, res: Response): Promise<void> => {
	const { token } = req.body;

	if (!token) {
		res.status(400).json({ message: 'Access token is required' });
		return;
	}

	try {
		const userInfoRes = await fetch(
			'https://www.googleapis.com/oauth2/v3/userinfo',
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		if (!userInfoRes.ok) {
			throw new Error('Failed to verify Google token');
		}

		const userInfo = (await userInfoRes.json()) as GoogleUserInfo;

		if (!userInfo.email) {
			throw new Error('No email provided by Google');
		}

		let user = await User.findOne({ email: userInfo.email.toLowerCase() });

		const getHighResAvatar = (url: string | undefined): string | null => {
			if (!url) return null;
			return url.replace(/=s\d+(-c)?$/, '=s512-c');
		};

		if (user) {
			// Update avatar and name if changed
			if (userInfo.picture && user.avatar !== getHighResAvatar(userInfo.picture))
				user.avatar = getHighResAvatar(userInfo.picture);
			if (userInfo.name && user.name !== userInfo.name)
				user.name = userInfo.name;

			// If user exists but was registered with a different provider
			if (user.provider !== 'google') {
				user.provider = 'google';
				user.providerId = userInfo.sub;
			}
			await user.save();
		} else {
			user = new User({
				email: userInfo.email.toLowerCase(),
				name: userInfo.name || 'User',
				role: 'customer',
				provider: 'google',
				providerId: userInfo.sub,
				avatar: getHighResAvatar(userInfo.picture),
				isEmailVerified: userInfo.email_verified === true,
				isActive: true,
			});
			await user.save();
		}

		const { accessToken, refreshToken, expiresAt } =
			await generateAccessAndRefreshTokens(user._id, req);
		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: 'Google login successful',
			user: publicUser(user),
			accessToken,
			refreshToken,
			sessionExpiresAt: expiresAt,
		});
	} catch (err: any) {
		console.error('Google login with token error:', err);
		res.status(401).json({ message: err.message || 'Google login failed' });
	}
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
	const { email, password } = req.body;

	if (!email || !password) {
		res.status(400).json({ message: 'Email and password are required' });
		return;
	}

	try {
		const user = await getUserByEmail(email);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (!user.isActive) {
			res.status(403).json({ message: 'Account is deactivated' });
			return;
		}

		if (!user.password) {
			res.status(400).json({ message: 'Please login with Google' });
			return;
		}

		const ok = await compare(password, user.password);
		if (!ok) {
			res.status(401).json({ message: 'Incorrect password' });
			return;
		}

		const { accessToken, refreshToken, expiresAt } =
			await generateAccessAndRefreshTokens(user._id, req);

		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: 'Login successful',
			user: publicUser(user),
			accessToken,
			refreshToken,
			sessionExpiresAt: expiresAt,
			redirectUrl: user.role === 'manufacturer' ? '/manufacturer' : '/customer',
		});
	} catch (err) {
		console.error('Login error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
	const { email, password, name, role, phoneNumber, address, city, postalCode, country, companyName, website, industry_registration } = req.body;

	if (!email || !password || !name) {
		res.status(400).json({ message: 'Email, password, and name are required' });
		return;
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		res.status(400).json({ message: 'Invalid email format' });
		return;
	}

	if (password.length < 8) {
		res.status(400).json({ message: 'Password must be at least 8 characters long' });
		return;
	}

	const validRoles = ['customer', 'manufacturer'];
	if (role && !validRoles.includes(role)) {
		res.status(400).json({ message: 'Invalid role' });
		return;
	}

	try {
		const exists = await User.findOne({ email: email.toLowerCase() });

		if (exists) {
			res.status(400).json({ message: 'Email already exists' });
			return;
		}

		// Check for company domain
		const emailDomain = email.split('@')[1];
		const company = await Company.findOne({ domain: emailDomain });

		if (company) {
			res.status(400).json({ 
				message: `This domain is managed by ${company.name}. Please contact your administrator for an invitation.` 
			});
			return;
		}

		const hashed = await hash(password, 10);

		const verificationToken = generateVerificationToken();
		const verificationOtp = generateOTP();
		const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
		const tokenExpiry = new Date(
			Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
		);

		const newUser = new User({
			email: email.toLowerCase(),
			password: hashed,
			name,
			role: role || 'customer',
			
			// Profile fields
			phoneNumber,
			address,
			city,
			postalCode,
			country,
			companyName,
			website,

			emailVerificationToken: verificationToken,
			emailVerificationExpiresAt: tokenExpiry,
			emailVerificationOtp: verificationOtp,
			emailVerificationOtpExpiresAt: otpExpiry,
		});

		await newUser.save();

		if (role === 'manufacturer') {
			const newCompany = new Company({
				name: companyName || emailDomain,
				domain: emailDomain,
				industryRegistration: industry_registration,
				adminId: newUser._id,
			});
			await newCompany.save();
			
			newUser.companyId = newCompany._id;
			await newUser.save();
		}

		const emailSent = await sendEmailVerification(
			newUser.email,
			verificationOtp,
			verificationToken,
			newUser.name,
		);

		const { accessToken, refreshToken, expiresAt } =
			await generateAccessAndRefreshTokens(newUser._id, req);

		attachTokens(accessToken, refreshToken, res);

		res.status(201).json({
			message: 'Registration successful. Please check your email for verification.',
			user: publicUser(newUser),
			accessToken,
			refreshToken,
			sessionExpiresAt: expiresAt,
			emailVerification: {
				emailSent,
				message: 'Verification email sent with both OTP and link methods.',
			},
			redirectUrl: newUser.role === 'manufacturer' ? '/manufacturer' : '/customer',
		});
	} catch (err) {
		console.error('Registration error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
	const incomingRefreshToken = extractRefreshToken(req);

	if (!incomingRefreshToken) {
		res.status(401).json({
			code: 'NO_REFRESH_TOKEN',
			message: 'Refresh token not found',
		});
		return;
	}

	try {
		const refreshTokenRecord = await RefreshToken.findOne({
			token: incomingRefreshToken,
			isActive: true,
			expiresAt: { $gt: new Date() },
		}).populate('userId');

		if (!refreshTokenRecord) {
			res.status(401).json({
				code: 'INVALID_REFRESH_TOKEN',
				message: 'Invalid or expired refresh token',
			});
			return;
		}

		const decodedToken = jwt.verify(incomingRefreshToken, JWT_SECRET) as { id: string };

		if (decodedToken.id !== (refreshTokenRecord.userId as any)._id.toString()) {
			res.status(401).json({
				code: 'TOKEN_MISMATCH',
				message: 'Token user mismatch',
			});
			return;
		}

		const populatedUser = refreshTokenRecord.userId as any as IUser;
		if (!populatedUser.isActive) {
			res.status(401).json({
				code: 'USER_INACTIVE',
				message: 'User account is deactivated',
			});
			return;
		}

		const extendWindow = shouldExtendRefreshWindow(refreshTokenRecord);

		const { accessToken, refreshToken, expiresAt } =
			await generateAccessAndRefreshTokens(
				populatedUser._id,
				req,
				extendWindow,
				refreshTokenRecord._id,
			);

		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: extendWindow
				? 'Access token refreshed and session extended'
				: 'Access token refreshed',
			accessToken,
			refreshToken,
			sessionExpiresAt: expiresAt,
			user: publicUser(populatedUser),
		});
	} catch (error) {
		console.error('Refresh token error:', error);

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
		};
		res.clearCookie('refreshToken', cookieOptions);

		res.status(401).json({
			code: 'REFRESH_TOKEN_EXPIRED',
			message: 'Invalid or expired refresh token',
		});
	}
};

import { extractToken } from '../helpers/auth.helpers.js';

export const verifyUser = async (req: Request, res: Response): Promise<void> => {
	try {
		res.json({
			message: 'User verified',
			user: publicUser((req as any).user),
			accessToken: extractToken(req),
		});
	} catch (err) {
		console.error('Verify user error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
	try {
		const refreshToken = extractRefreshToken(req);

		if (refreshToken) {
			await RefreshToken.findOneAndUpdate(
				{ token: refreshToken, userId: (req as any).user.id },
				{ isActive: false },
			);
		}

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
		};

		res.clearCookie('accessToken', cookieOptions);
		res.clearCookie('refreshToken', cookieOptions);
		res.setHeader('Authorization', '');

		res.json({ message: 'Logout successful' });
	} catch (err) {
		console.error('Logout error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const getUserDevices = async (req: Request, res: Response): Promise<void> => {
	try {
		const devices = await RefreshToken.find({
			userId: (req as any).user.id,
			isActive: true,
			expiresAt: { $gt: new Date() },
		}).select('deviceInfo lastUsed expiresAt createdAt');

		res.json({
			devices: devices.map((device) => ({
				id: device._id,
				deviceName: device.deviceInfo.deviceName,
				userAgent: device.deviceInfo.userAgent,
				ipAddress: device.deviceInfo.ipAddress,
				lastUsed: device.lastUsed,
				expiresAt: device.expiresAt,
				createdAt: device.createdAt,
			})),
		});
	} catch (error) {
		console.error('Get devices error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const logoutDevice = async (req: Request, res: Response): Promise<void> => {
	const { deviceId } = req.params;

	try {
		const result = await RefreshToken.findOneAndUpdate(
			{
				_id: deviceId,
				userId: (req as any).user.id,
			},
			{ isActive: false },
		);

		if (!result) {
			res.status(404).json({ message: 'Device not found' });
			return;
		}

		res.json({ message: 'Device logged out successfully' });
	} catch (error) {
		console.error('Logout device error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const logoutAllDevices = async (req: Request, res: Response): Promise<void> => {
	try {
		await RefreshToken.updateMany({ userId: (req as any).user.id }, { isActive: false });

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
		};

		res.clearCookie('accessToken', cookieOptions);
		res.clearCookie('refreshToken', cookieOptions);

		res.json({ message: 'All devices logged out successfully' });
	} catch (error) {
		console.error('Logout all devices error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

// Email verification
export const verifyEmailWithOTP = async (req: Request, res: Response): Promise<void> => {
	const { email, otp } = req.body;

	if (!email || !otp) {
		res.status(400).json({ message: 'Email and OTP are required' });
		return;
	}

	try {
		const user = await User.findOne({ email: email.toLowerCase() });

		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (user.isEmailVerified) {
			res.status(400).json({ message: 'Email is already verified' });
			return;
		}

		if (!user.emailVerificationOtp || !user.emailVerificationOtpExpiresAt) {
			res.status(400).json({ message: 'No OTP found. Please request a new verification email.' });
			return;
		}

		if (new Date() > user.emailVerificationOtpExpiresAt) {
			res.status(400).json({ message: 'OTP has expired. Please request a new verification email.' });
			return;
		}

		if (user.emailVerificationOtp !== otp) {
			res.status(400).json({ message: 'Invalid OTP' });
			return;
		}

		user.isEmailVerified = true;
		user.emailVerificationOtp = null;
		user.emailVerificationOtpExpiresAt = null;
		user.emailVerificationToken = null;
		user.emailVerificationExpiresAt = null;

		await user.save();

		// Refresh tokens to update session with verified status
		const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, req);
		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: 'Email verified successfully',
			user: publicUser(user),
			accessToken,
		});
	} catch (error) {
		console.error('Email verification OTP error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const verifyEmailWithToken = async (req: Request, res: Response): Promise<void> => {
	const { token } = req.params;

	if (!token) {
		res.status(400).json({ message: 'Verification token is required' });
		return;
	}

	try {
		const user = await User.findOne({
			emailVerificationToken: token,
			emailVerificationExpiresAt: { $gt: new Date() },
		});

		if (!user) {
			res.status(400).json({ message: 'Invalid or expired verification token' });
			return;
		}

		if (user.isEmailVerified) {
			res.status(400).json({ message: 'Email is already verified' });
			return;
		}

		user.isEmailVerified = true;
		user.emailVerificationOtp = null;
		user.emailVerificationOtpExpiresAt = null;
		user.emailVerificationToken = null;
		user.emailVerificationExpiresAt = null;

		await user.save();

		// Refresh tokens to update session with verified status
		const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, req);
		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: 'Email verified successfully',
			user: publicUser(user),
			accessToken,
		});
	} catch (error) {
		console.error('Email verification token error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
	const { email } = req.body;

	if (!email) {
		res.status(400).json({ message: 'Email is required' });
		return;
	}

	try {
		const user = await User.findOne({ email: email.toLowerCase() });

		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (user.isEmailVerified) {
			res.status(400).json({ message: 'Email is already verified' });
			return;
		}

		const newOtp = generateOTP();
		const newToken = generateVerificationToken();
		const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
		const tokenExpiry = new Date(
			Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
		);

		user.emailVerificationOtp = newOtp;
		user.emailVerificationOtpExpiresAt = otpExpiry;
		user.emailVerificationToken = newToken;
		user.emailVerificationExpiresAt = tokenExpiry;

		const emailSent = await sendEmailVerification(
			user.email,
			newOtp,
			newToken,
			user.name,
		);

		await user.save();

		res.json({
			message: 'Verification email sent successfully',
			emailVerification: { emailSent },
		});
	} catch (error) {
		console.error('Resend verification email error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const checkEmailVerificationStatus = async (req: Request, res: Response): Promise<void> => {
	const { email } = req.params;

	if (!email) {
		res.status(400).json({ message: 'Email is required' });
		return;
	}

	try {
		const user = await User.findOne({ email: (email as string).toLowerCase() });

		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		res.json({
			isEmailVerified: user.isEmailVerified,
			hasOtp: !!user.emailVerificationOtp,
			hasToken: !!user.emailVerificationToken,
			otpExpiresAt: user.emailVerificationOtpExpiresAt,
			tokenExpiresAt: user.emailVerificationExpiresAt,
		});
	} catch (error) {
		console.error('Check email verification status error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const setupAccount = async (req: Request, res: Response): Promise<void> => {
	const { userId, companyId, otp, password, name, phoneNumber, address, city, postalCode, country } = req.body;

	if (!userId || !companyId || !otp || !password) {
		res.status(400).json({ message: 'Missing required fields' });
		return;
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (user.companyId?.toString() !== companyId) {
			res.status(400).json({ message: 'Invalid company association' });
			return;
		}

		// Verify OTP (using emailVerificationOtp fields reusing them for invite)
		if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) {
			res.status(400).json({ message: 'Invalid OTP' });
			return;
		}

		if (user.emailVerificationOtpExpiresAt && new Date() > user.emailVerificationOtpExpiresAt) {
			res.status(400).json({ message: 'OTP has expired' });
			return;
		}

		const hashedPassword = await hash(password, 10);

		user.password = hashedPassword;
		user.name = name || user.name;
		user.phoneNumber = phoneNumber;
		user.address = address;
		user.city = city;
		user.postalCode = postalCode;
		user.country = country;
		
		user.isActive = true;
		user.isEmailVerified = true;
		user.isInvited = false; // no longer just "invited"
		user.emailVerificationOtp = null;
		user.emailVerificationOtpExpiresAt = null;
		user.invitationToken = null;
		
		await user.save();

		// Auto login
		const { accessToken, refreshToken, expiresAt } = await generateAccessAndRefreshTokens(user._id, req);
		attachTokens(accessToken, refreshToken, res);

		res.json({
			message: 'Account setup successful',
			user: publicUser(user),
			accessToken,
			refreshToken,
			sessionExpiresAt: expiresAt,
		});

	} catch (error) {
		console.error('Setup account error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
	const { role } = req.body;
	const userId = (req as any).user.id;

	const validRoles = ['customer', 'manufacturer'];
	if (!validRoles.includes(role)) {
		res.status(400).json({ message: 'Invalid role' });
		return;
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		user.role = role;
		await user.save();

		res.json({
			message: 'Role updated successfully',
			user: publicUser(user),
		});
	} catch (error) {
		console.error('Update role error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
	const { phoneNumber, address, city, postalCode, country, companyName, website } = req.body;
	const userId = (req as any).user.id;

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
		if (address !== undefined) user.address = address;
		if (city !== undefined) user.city = city;
		if (postalCode !== undefined) user.postalCode = postalCode;
		if (country !== undefined) user.country = country;
		if (companyName !== undefined) user.companyName = companyName;
		if (website !== undefined) user.website = website;

		await user.save();

		res.json({
			message: 'Profile updated successfully',
			user: publicUser(user),
		});
	} catch (error) {
		console.error('Update profile error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
	const { currentPassword, newPassword } = req.body;
	const userId = (req as any).user.id;

	if (!newPassword || newPassword.length < 8) {
		res.status(400).json({ message: 'New password must be at least 8 characters long' });
		return;
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (!user.password) {
			res.status(400).json({ message: 'User has no password set (OAuth user)' });
			return;
		}

		const ok = await compare(currentPassword, user.password);
		if (!ok) {
			res.status(401).json({ message: 'Incorrect current password' });
			return;
		}

		const hashed = await hash(newPassword, 10);
		user.password = hashed;
		user.mustChangePassword = false; // Clear the flag
		
		await user.save();

		res.json({ message: 'Password changed successfully' });
	} catch (error) {
		console.error('Change password error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user.id;

	try {
		const currentUser = await User.findById(userId);
		if (!currentUser) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		// Check if user is a company admin
		const company = await Company.findOne({ adminId: userId });

		if (company) {
			// CASCADE DELETE: ADMIN is deleting. Wipe the entire company.
			
			// 1. Find all users associated with this company
			const companyUsers = await User.find({ companyId: company._id });
			const userIds = companyUsers.map(u => u._id);

			// 2. Delete all related data for all company users
			await Promise.all([
				CabinetItem.deleteMany({ userId: { $in: userIds } }),
				RefreshToken.deleteMany({ userId: { $in: userIds } }),
				Product.deleteMany({ createdBy: { $in: userIds } }),
				Batch.deleteMany({ createdBy: { $in: userIds } })
			]);

			// 3. Delete all company users
			await User.deleteMany({ companyId: company._id });

			// 4. Delete the company itself
			await Company.findByIdAndDelete(company._id);
		} else {
			// INDIVIDUAL DELETE: Standard customer or non-admin employee
			
			// 1. Delete associated data
			await Promise.all([
				CabinetItem.deleteMany({ userId }),
				RefreshToken.deleteMany({ userId }),
				// If they happen to have products/batches (e.g. employee), delete those too
				Product.deleteMany({ createdBy: userId }),
				Batch.deleteMany({ createdBy: userId })
			]);

			// 2. Delete the user
			await User.findByIdAndDelete(userId);
		}

		// Clear cookies for the requester
		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
		};
		res.clearCookie('accessToken', cookieOptions);
		res.clearCookie('refreshToken', cookieOptions);

		res.json({ message: 'Account and associated data deleted successfully' });
	} catch (error) {
		console.error('Delete account error:', error);
		res.status(500).json({ message: 'Server error during account deletion' });
	}
};

/**
 * Change email for unverified user and restart verification process.
 */
export const changeEmail = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user.id;
	const { newEmail } = req.body;

	if (!newEmail) {
		res.status(400).json({ message: 'New email is required' });
		return;
	}

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (user.isEmailVerified) {
			res.status(400).json({ message: 'Email is already verified. Use account settings to change it.' });
			return;
		}

		const exists = await User.findOne({ email: newEmail.toLowerCase() });
		if (exists && exists._id.toString() !== user._id.toString()) {
			res.status(400).json({ message: 'New email already in use' });
			return;
		}

		// Update email and generate new verification data
		user.email = newEmail.toLowerCase();
		
		const verificationToken = generateVerificationToken();
		const verificationOtp = generateOTP();
		const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
		const tokenExpiry = new Date(
			Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
		);

		user.emailVerificationToken = verificationToken;
		user.emailVerificationExpiresAt = tokenExpiry;
		user.emailVerificationOtp = verificationOtp;
		user.emailVerificationOtpExpiresAt = otpExpiry;

		await user.save();

		// Update company ID if manufacturer
		const emailDomain = user.email.split('@')[1];
		const company = await Company.findOne({ domain: emailDomain });
		if (company && user.role === 'manufacturer') {
			user.companyId = company._id;
			await user.save();
		}

		await sendEmailVerification(
			user.email,
			verificationOtp,
			verificationToken,
			user.name,
		);

		res.json({ 
			message: 'Email updated. A new verification code has been sent.', 
			email: user.email 
		});
	} catch (err) {
		console.error('Change email error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};
