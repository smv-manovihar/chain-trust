import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model.js';

export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const user = await User.findById((req as any).user.id);

		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		if (!user.isEmailVerified) {
			res.status(403).json({
				message: 'Email verification required',
				emailVerificationRequired: true,
				email: user.email,
			});
			return;
		}

		next();
	} catch (error) {
		console.error('Email verification middleware error:', error);
		res.status(500).json({ message: 'Server error' });
	}
};

export const checkEmailVerification = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
	try {
		const user = await User.findById((req as any).user.id);

		if (!user) {
			_res.status(404).json({ message: 'User not found' });
			return;
		}

		(req as any).userEmailVerified = user.isEmailVerified;
		(req as any).userEmail = user.email;

		next();
	} catch (error) {
		console.error('Email verification check middleware error:', error);
		_res.status(500).json({ message: 'Server error' });
	}
};
