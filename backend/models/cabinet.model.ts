import { Schema, model, Document, Types } from 'mongoose';
import { deleteFile } from '../services/s3.service.js';

export interface IReminderTime {
	time: Date; // Stored as UTC literal
	mealContext?: 'before_meal' | 'after_meal' | 'with_meal' | 'no_preference';
}

export interface INotificationOverride {
	medicine_expiry?: { inApp?: boolean; email?: boolean };
	batch_recall?: { inApp?: boolean; email?: boolean };
	dose_reminder?: { inApp?: boolean; email?: boolean };
}

export interface ICabinetItem extends Document {
	// 1. Identity & Linking
	userId: Types.ObjectId;
	name: string;
	brand: string;
	isUserAdded: boolean;
	batchId?: Types.ObjectId;     // Direct ref to verified Batch in DB
	prescriptionIds: Types.ObjectId[]; // Links to central Prescription pool

	// 2. Tracking (Business IDs)
	productId?: string;           // SKU (For manual items, derived from name)
	batchNumber?: string;         // Lot # (For verified items)
	salt?: string;                // QR Salt (GUID:unitIndex:unitHash)
	medicineCode?: string;        // Barcode/UPC

	// 3. Medical Content
	composition?: string;
	expiryDate?: Date;
	description?: string;
	images?: string[];

	// 4. Dose & Usage
	dosage?: string;
	frequency?: string;
	currentQuantity?: number;
	totalQuantity?: number;
	unit?: string;
	doctorName?: string;
	notes?: string;

	// 5. Notifications & Reminders
	reminderTimes?: IReminderTime[];
	notificationOverrides?: INotificationOverride;

	// 6. Lifecycle Status
	status: 'active' | 'inactive';

	createdAt: Date;
	updatedAt: Date;
}

const cabinetItemSchema = new Schema<ICabinetItem>(
	{
		// 1. Identity & Linking
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		name: { type: String, required: true },
		brand: { type: String, required: true },
		isUserAdded: { type: Boolean, default: false },
		batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
		prescriptionIds: [{ type: Schema.Types.ObjectId, ref: 'Prescription' }],

		// 2. Tracking (Business IDs)
		productId: { type: String },
		batchNumber: { type: String },
		salt: { type: String },
		medicineCode: { type: String },

		// 3. Medical Content
		composition: { type: String, trim: true },
		expiryDate: { type: Date },
		description: { type: String, trim: true },
		images: { type: [String], default: [] },

		// 4. Dose & Usage
		dosage: { type: String, trim: true },
		frequency: { type: String, trim: true },
		currentQuantity: { type: Number, default: 30 },
		totalQuantity: { type: Number, default: 30 },
		unit: { type: String, default: 'pills' },
		doctorName: { type: String, trim: true },
		notes: { type: String, trim: true },

		// 5. Notifications & Reminders
		reminderTimes: [
			{
				time: { type: Date, required: true },
				mealContext: {
					type: String,
					enum: ['before_meal', 'after_meal', 'with_meal', 'no_preference'],
					default: 'no_preference',
				},
			},
		],
		notificationOverrides: {
			medicine_expiry: {
				inApp: { type: Boolean },
				email: { type: Boolean },
			},
			batch_recall: {
				inApp: { type: Boolean },
				email: { type: Boolean },
			},
			dose_reminder: {
				inApp: { type: Boolean },
				email: { type: Boolean },
			},
		},
		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active',
		},
	},
	{
		timestamps: true,
		collection: 'cabinet_items',
	},
);

// Middleware to clean up S3 images on deletion
cabinetItemSchema.post('findOneAndDelete', async function (doc) {
	if (doc && doc.images && doc.images.length > 0) {
		for (const imageUrl of doc.images) {
			try {
				await deleteFile(imageUrl);
			} catch (error) {
				console.error(`Failed to delete S3 image: ${imageUrl}`, error);
			}
		}
	}
});

// Indexes
// Optimized for: (1) Uniqueness per user for manual items using name-derived productId
// (2) Uniqueness per user for verified items using SKU (productId)
cabinetItemSchema.index({ userId: 1, productId: 1, isUserAdded: 1 }, { unique: true });
cabinetItemSchema.index({ salt: 1 });

const CabinetItem = model<ICabinetItem>('CabinetItem', cabinetItemSchema);

export default CabinetItem;
