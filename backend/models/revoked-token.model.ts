import { Schema, model, Document } from 'mongoose';

export interface IRevokedToken extends Document {
	token: string;
	expiresAt: Date;
}

const revokedTokenSchema = new Schema<IRevokedToken>(
	{
		token: { type: String, required: true, index: true },
		expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
	},
	{
		timestamps: true,
		collection: 'revoked_tokens',
	},
);

const RevokedToken = model<IRevokedToken>('RevokedToken', revokedTokenSchema);

export default RevokedToken;
