import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAlert extends Document {
	type: 'suspicious_scan' | 'expiry_alert' | 'recall_notice' | 'system';
	message: string;
	isRead: boolean;
	metadata?: {
		batchId?: Types.ObjectId;
		unitIndex?: number;
		visitorId?: string;
		ip?: string;
		hash?: string;
	};
	createdBy: Types.ObjectId; // The manufacturer/user this alert belongs to
	createdAt: Date;
	updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
	{
		type: {
			type: String,
			required: true,
			enum: ['suspicious_scan', 'expiry_alert', 'recall_notice', 'system'],
			default: 'system',
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		isRead: {
			type: Boolean,
			default: false,
		},
		metadata: {
			batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
			unitIndex: { type: Number },
			visitorId: { type: String },
			ip: { type: String },
			hash: { type: String }, // For legacy/expiry alerts
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'alerts',
	},
);

// Index for performance
alertSchema.index({ createdBy: 1, isRead: 1 });
alertSchema.index({ type: 1 });

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
