import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
	_id: Types.ObjectId;
	email: string;
	password: string | null;
	name: string;
	role: 'customer' | 'manufacturer' | 'employee';
	provider: string;
	providerId: string | null;
	avatar: string | null;
	isActive: boolean;
	lastActivity: Date;

	// Profile details
	phoneNumber?: string;
	address?: string;
	city?: string;
	postalCode?: string;
	country?: string;
	companyName?: string;
	website?: string;

	// Company association
	companyId?: Types.ObjectId;

	// Email verification
	isEmailVerified: boolean;
	emailVerificationToken: string | null;
	emailVerificationExpiresAt: Date | null;
	emailVerificationOtp: string | null;
	emailVerificationOtpExpiresAt: Date | null;

	// Invitation (for employees)
	isInvited: boolean;
	invitationToken?: string | null;
	invitationExpires?: Date | null;

	// Password reset
	resetPasswordToken: string | null;
	resetPasswordExpiresAt: Date | null;
	resetPasswordOtp: string | null;
	resetPasswordOtpExpiresAt: Date | null;

	// Password Change Requirement
	mustChangePassword: boolean;

	createdAt: Date;
	updatedAt: Date;
}

const userSchema = new Schema<IUser>(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: { type: String, default: null },
		name: { type: String, required: true, trim: true },
		role: {
			type: String,
			enum: ['customer', 'manufacturer', 'employee'],
			default: 'customer',
		},
		provider: { type: String, default: 'local' },
		providerId: { type: String, default: null },
		avatar: { type: String, default: null },
		isActive: { type: Boolean, default: true },
		lastActivity: { type: Date, default: Date.now },

		// Profile details
		phoneNumber: { type: String, trim: true },
		address: { type: String, trim: true },
		city: { type: String, trim: true },
		postalCode: { type: String, trim: true },
		country: { type: String, trim: true },
		companyName: { type: String, trim: true },
		website: { type: String, trim: true },

		// Company association
		companyId: { type: Schema.Types.ObjectId, ref: 'Company' },

		// Email verification fields
		isEmailVerified: { type: Boolean, default: false },
		emailVerificationToken: { type: String, default: null },
		emailVerificationExpiresAt: { type: Date, default: null },
		emailVerificationOtp: { type: String, default: null },
		emailVerificationOtpExpiresAt: { type: Date, default: null },

		// Invitation fields
		isInvited: { type: Boolean, default: false },
		invitationToken: { type: String, default: null },
		invitationExpires: { type: Date, default: null },

		// Password reset fields
		resetPasswordToken: { type: String, default: null },
		resetPasswordExpiresAt: { type: Date, default: null },
		resetPasswordOtp: { type: String, default: null },
		resetPasswordOtpExpiresAt: { type: Date, default: null },

		// Force password change
		mustChangePassword: { type: Boolean, default: false },
	},
	{
		timestamps: true,
		collection: 'users',
	},
);

userSchema.index(
	{ provider: 1, providerId: 1 },
	{ unique: true, sparse: true },
);

export default model<IUser>('User', userSchema);
