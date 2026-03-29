import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
	user: Types.ObjectId; // Receiver of the notification
	type: 
		| 'medicine_expiry'    // Customer
		| 'batch_recall'       // Customer
		| 'dose_reminder'      // Customer
		| 'suspicious_scan'    // Manufacturer
		| 'scan_milestone'     // Manufacturer
		| 'system';
	title: string;
	message: string;
	isRead: boolean;
	channel: 'in_app' | 'email' | 'both';
	link?: string;
	metadata?: {
		batchId?: Types.ObjectId;
		productId?: Types.ObjectId;
		cabinetItemId?: Types.ObjectId;
		medicineName?: string;
		expiryDate?: Date; // Corrected to Date as per v11 Standard
		ip?: string;
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
			enum: [
				'medicine_expiry', 'batch_recall', 'dose_reminder',
				'suspicious_scan', 'scan_milestone', 'system'
			],
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
		channel: {
			type: String,
			enum: ['in_app', 'email', 'both'],
			default: 'in_app'
		},
		link: {
			type: String,
			trim: true,
		},
		metadata: {
			batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
			productId: { type: Schema.Types.ObjectId, ref: 'Product' },
			cabinetItemId: { type: Schema.Types.ObjectId, ref: 'CabinetItem' },
			medicineName: { type: String },
			expiryDate: { type: Date }, // Updated to Date for UTC
			ip: { type: String },
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
