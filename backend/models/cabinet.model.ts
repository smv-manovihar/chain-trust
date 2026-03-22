import { Schema, model, Document, Types } from 'mongoose';

export interface ICabinetItem extends Document {
	userId: Types.ObjectId;
	name: string;
	brand: string;
	productId: string;
	batchNumber: string;
	expiryDate?: string;
	images?: string[];
	salt?: string;
	isUserAdded: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const cabinetItemSchema = new Schema<ICabinetItem>(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		name: { type: String, required: true },
		brand: { type: String, required: true },
		productId: { type: String, required: true },
		batchNumber: { type: String, required: true },
		expiryDate: { type: String },
		images: { type: [String], default: [] },
		salt: { type: String },
		isUserAdded: { type: Boolean, default: false },
	},
	{
		timestamps: true,
		collection: 'cabinet_items',
	},
);

// Unique across userId, productId AND isUserAdded to allow multiple entries for user-added vs verified if needed,
// but usually we want to prevent duplicates for the same user-added item.
cabinetItemSchema.index({ userId: 1, productId: 1, isUserAdded: 1 }, { unique: true });

export default model<ICabinetItem>('CabinetItem', cabinetItemSchema);
