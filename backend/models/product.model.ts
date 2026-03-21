import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
	name: string;
	productId: string; // SKU, NDC, or any identifier the manufacturer uses
	categories: string[];
	brand: string;
	price: number;
	description?: string;
	images: string[]; // S3/MinIO URLs
	qrSettings: {
		qrSize: number;
		columns: number;
		showProductName: boolean;
		showUnitIndex: boolean;
		showBatchNumber: boolean;
		labelPadding: number;
	};
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
		categories: {
			type: [String],
			default: [],
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
		qrSettings: {
			qrSize: { type: Number, default: 40 }, // mm
			columns: { type: Number, default: 4 },
			showProductName: { type: Boolean, default: true },
			showUnitIndex: { type: Boolean, default: true },
			showBatchNumber: { type: Boolean, default: true },
			labelPadding: { type: Number, default: 10 }, // px
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
		collection: 'products',
	},
);

// Same manufacturer can't have duplicate product IDs
productSchema.index({ productId: 1, createdBy: 1 }, { unique: true });

export default mongoose.model<IProduct>('Product', productSchema);
