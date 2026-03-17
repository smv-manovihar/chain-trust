import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
	name: string;
	productId: string; // SKU, NDC, or any identifier the manufacturer uses
	category: string;
	brand: string;
	price: number;
	description?: string;
	images: string[]; // S3/MinIO URLs
	createdBy: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		productId: {
			type: String,
			required: true,
			trim: true,
		},
		category: {
			type: String,
			required: true,
			trim: true,
		},
		brand: {
			type: String,
			required: true,
			trim: true,
		},
		price: {
			type: Number,
			default: 0,
		},
		description: {
			type: String,
			trim: true,
		},
		images: {
			type: [String],
			default: [],
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

// Same manufacturer can't have duplicate product IDs
productSchema.index({ productId: 1, createdBy: 1 }, { unique: true });

export default mongoose.model<IProduct>('Product', productSchema);
