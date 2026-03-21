import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
	user: Types.ObjectId; // The user (manufacturer/employee) receiving the notification
	type: 'alert' | 'scan_milestone' | 'system' | 'expiry';
	title: string;
	message: string;
	isRead: boolean;
	link?: string; // Optional path to navigate to when clicked
	metadata?: {
		batchId?: Types.ObjectId;
		productId?: Types.ObjectId;
		alertId?: Types.ObjectId;
	};
	createdAt: Date;
	updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		type: {
			type: String,
			enum: ['alert', 'scan_milestone', 'system', 'expiry'],
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
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
		link: {
			type: String,
			trim: true,
		},
		metadata: {
			batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
			productId: { type: Schema.Types.ObjectId, ref: 'Product' },
			alertId: { type: Schema.Types.ObjectId, ref: 'Alert' },
		},
	},
	{
		timestamps: true,
		collection: 'notifications',
	},
);

// Indexes for fast retrieval of unread notifications for a specific user
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
