import User, { IUser } from '../models/user.model.js';

export const getUserById = async (id: string): Promise<IUser | null> => {
	try {
		const user = await User.findById(id);
		return user;
	} catch (err) {
		console.error('User validation error:', err);
		return null;
	}
};

export const getUserByEmail = async (email: string): Promise<IUser | null> => {
	try {
		const user = await User.findOne({ email: email.toLowerCase() });
		return user;
	} catch (err) {
		console.error('User validation error:', err);
		return null;
	}
};
