import { Schema, model, Document, Types } from 'mongoose';

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
	userId: Types.ObjectId;
	name: string;
	brand: string;
	productId?: string;
	batchNumber?: string;
	medicineCode?: string;
	composition?: string;
	expiryDate?: Date;
	images?: string[];
	salt?: string;
	isUserAdded: boolean;

	// Management fields
	description?: string;
	notes?: string;
	dosage?: string;
	frequency?: string;
	currentQuantity?: number;
	totalQuantity?: number;
	unit?: string;
	reminderTimes?: IReminderTime[];
	notificationOverrides?: INotificationOverride;
	prescriptions: {
		url: string;
		label: string;
		uploadedAt: Date;
	}[];

	createdAt: Date;
	updatedAt: Date;
}

const cabinetItemSchema = new Schema<ICabinetItem>(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		name: { type: String, required: true },
		brand: { type: String, required: true },
		productId: { type: String },
		batchNumber: { type: String },
		medicineCode: { type: String },
		composition: { type: String, trim: true },
		expiryDate: { type: Date },
		images: { type: [String], default: [] },
		salt: { type: String },
		isUserAdded: { type: Boolean, default: false },

		// Management fields
		description: { type: String, trim: true },
		notes: { type: String, trim: true },
		dosage: { type: String, trim: true },
		frequency: { type: String, trim: true },
		currentQuantity: { type: Number, default: 30 },
		totalQuantity: { type: Number, default: 30 },
		unit: { type: String, default: 'pills' },
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
		prescriptions: [
			{
				url: { type: String, required: true },
				label: { type: String, required: true },
				uploadedAt: { type: Date, default: Date.now },
			},
		],
	},
	{
		timestamps: true,
		collection: 'cabinet_items',
	},
);

// Indexes
cabinetItemSchema.index({ userId: 1, name: 1, isUserAdded: 1 });
cabinetItemSchema.index({ userId: 1, productId: 1, isUserAdded: 1 });

export default model<ICabinetItem>('CabinetItem', cabinetItemSchema);
