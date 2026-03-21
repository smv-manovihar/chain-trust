import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBatch extends Document {
	batchNumber: string;
	product: Types.ObjectId; // Reference to the Product catalogue item
	// Cached product fields for fast access without populate
	productName: string;
	productId: string; // The user-facing SKU/NDC from the Product
	categories: string[];
	brand: string;
	images: string[];
	// Batch-specific fields
	quantity: number;
	manufactureDate: Date;
	expiryDate?: Date;
	description?: string;
	batchSalt: string; // SHA-256 base salt for deriving unit salts
	blockchainHash: string;
	isOnBlockchain: boolean;
	isRecalled: boolean;
	createdBy: Types.ObjectId;
	scanCounts: Map<string, number>; // unitIndex -> scan count
	createdAt: Date;
	updatedAt: Date;
}

const batchSchema = new Schema<IBatch>(
	{
		batchNumber: {
			type: String,
			required: true,
			trim: true,
		},
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		// Cached product info (denormalized for performance)
		productName: {
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
		images: {
			type: [String],
			default: [],
		},
		// Batch-specific
		quantity: {
			type: Number,
			required: true,
			min: 1,
		},
		manufactureDate: {
			type: Date,
			required: true,
		},
		expiryDate: {
			type: Date,
		},
		description: {
			type: String,
			trim: true,
		},
		batchSalt: {
			type: String,
			required: true,
			unique: true,
		},
		blockchainHash: {
			type: String,
			trim: true,
		},
		isOnBlockchain: {
			type: Boolean,
			default: false,
		},
		isRecalled: {
			type: Boolean,
			default: false,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		scanCounts: {
			type: Map,
			of: Number,
			default: new Map(),
		},
	},
	{
		timestamps: true,
		collection: 'batches',
	},
);

// Compound unique index: same manufacturer shouldn't create duplicate batch numbers
batchSchema.index({ batchNumber: 1, createdBy: 1 }, { unique: true });

export default mongoose.model<IBatch>('Batch', batchSchema);
