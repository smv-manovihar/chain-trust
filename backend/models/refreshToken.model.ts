import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceInfo {
	userAgent: string;
	ipAddress: string;
	deviceId: string;
	deviceName: string;
}

export interface IRefreshToken extends Document {
	_id: Types.ObjectId;
	token: string;
	userId: Types.ObjectId;
	expiresAt: Date;
	deviceInfo: IDeviceInfo;
	isActive: boolean;
	lastUsed: Date;
	createdAt: Date;
	updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
	{
		token: { type: String, required: true, unique: true },
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
		deviceInfo: {
			userAgent: { type: String, default: '' },
			ipAddress: { type: String, default: '' },
			deviceId: { type: String, required: true },
			deviceName: { type: String, default: 'Unknown Device' },
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		lastUsed: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, 'deviceInfo.deviceId': 1 });
refreshTokenSchema.index({ isActive: 1 });

export default model<IRefreshToken>('RefreshToken', refreshTokenSchema, 'RefreshTokens');
