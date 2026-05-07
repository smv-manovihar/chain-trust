import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
	user: Types.ObjectId; // Receiver of the notification
	type: 
		| 'medicine_expiry'    // Customer
		| 'batch_recall'       // Customer
		| 'dose_reminder'      // Customer
		| 'missed_dose'        // Customer
		| 'low_stock'          // Customer
		| 'suspicious_scan'    // Manufacturer
		| 'scan_milestone'     // Manufacturer
		| 'batch_restored'     // Customer
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
				'medicine_expiry', 'batch_recall', 'dose_reminder', 'missed_dose',
				'low_stock', 'suspicious_scan', 'scan_milestone', 'batch_restored', 'system'
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

/**
 * Enforce the 50-notification limit per user.
 * Automatically deletes the oldest notifications when a new one is saved.
 */
notificationSchema.post('save', async function (doc: INotification) {
	try {
		const MAX_NOTIFICATIONS = 50;
		const user = doc.user;

		const count = await mongoose.model('Notification').countDocuments({ user });
		
		if (count > MAX_NOTIFICATIONS) {
			const toDelete = count - MAX_NOTIFICATIONS;
			const oldestNotifications = await mongoose.model('Notification')
				.find({ user })
				.sort({ createdAt: 1 })
				.limit(toDelete)
				.select('_id');
			
			const idsToDelete = oldestNotifications.map(n => n._id);
			if (idsToDelete.length > 0) {
				await mongoose.model('Notification').deleteMany({ _id: { $in: idsToDelete } });
				console.log(`[Notification Cleanup] Pruned ${idsToDelete.length} notifications for user ${user}`);
			}
		}
	} catch (error) {
		console.error('[Notification Cleanup Error]:', error);
	}
});

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
