import { Schema, model, Document, Types } from 'mongoose';

export interface ICabinetItem extends Document {
	userId: Types.ObjectId;
	name: string;
	brand: string;
	productId: string;
	batchNumber: string;
	expiryDate?: string;
	images?: string[];
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
	},
	{
		timestamps: true,
		collection: 'user-cabinets',
	},
);

// Ensure a user can't add the exact same product multiple times
cabinetItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default model<ICabinetItem>('CabinetItem', cabinetItemSchema);
