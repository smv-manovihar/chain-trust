import mongoose, { Document, Schema, Types } from 'mongoose';

export type EnrollmentStatus = 'pending' | 'completed' | 'failed';

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
		showProductName: boolean;
		showUnitIndex: boolean;
		showBatchNumber: boolean;
	};
	createdBy: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
	status: EnrollmentStatus;
	wizardState: any; // Dynamic dict for UI state tracking (FIX-004)
}

const productSchema = new Schema<IProduct>(
	{
		name: {
			type: String,
			required: true, // Name is still mandated at Step 1
			trim: true,
		},
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed'],
			default: 'pending',
		},
		productId: {
			type: String,
			required: false, // Draft support
			trim: true,
		},
		categories: {
			type: [String],
			default: [],
		},
		brand: {
			type: String,
			required: false, // Draft support
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
			qrSize: { type: Number, default: 20, min: 20 }, // mm (Standard medicine pack size)
			showProductName: { type: Boolean, default: true },
			showUnitIndex: { type: Boolean, default: true },
			showBatchNumber: { type: Boolean, default: true },
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		// Dynamic Wizard State: Stores the full UI context for resuming (FIX-004)
		wizardState: {
			type: Schema.Types.Mixed,
			default: {},
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
