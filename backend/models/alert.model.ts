import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
	hash: string;
	email: string;
	expiryDate: Date;
	reminderDate: Date;
	createdAt: Date;
}

const alertSchema = new Schema<IAlert>(
	{
		hash: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			trim: true,
		},
		expiryDate: {
			type: Date,
			required: true,
		},
		reminderDate: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'alerts',
	},
);

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
