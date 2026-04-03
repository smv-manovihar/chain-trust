import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
	name: string;
	productId: string; // SKU, NDC, or any identifier the manufacturer uses
	categories: string[];
	brand: string;
	price: number;
	composition: string;
	description?: string;
	unit: string;
	images: string[]; // S3/MinIO URLs
	imageAccessLevel?: 'public' | 'verified_only' | 'internal_only';
	customerVisibleImages?: number[]; // Indices of images visible to customers
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
		unit: {
			type: String,
			default: 'pills',
		},
		images: {
			type: [String],
			default: [],
		},
		imageAccessLevel: {
			type: String,
			enum: ['public', 'verified_only', 'internal_only'],
			default: 'public',
		},
		customerVisibleImages: {
			type: [Number],
			default: [],
		},
		composition: {
			type: String,
			trim: true,
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

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;
