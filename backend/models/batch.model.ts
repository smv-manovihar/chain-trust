import mongoose, { Document, Schema, Types } from 'mongoose';

export type EnrollmentStatus = 'pending' | 'completed' | 'failed';

export interface IBatch extends Document {
	batchNumber: string;
	product: Types.ObjectId; // Reference to the Product catalogue item
	// Cached product fields for fast access without populate
	productName: string;
	productId: string; // The user-facing SKU/NDC from the Product
	categories: string[];
	brand: string;
	images: string[];
	customerVisibleImages?: number[]; // Cached from Product
	// Batch-specific fields
	quantity: number;
	manufactureDate: Date;
	expiryDate: Date;
	description?: string;
	batchSalt: string; // SHA-256 base salt for deriving unit salts
	blockchainHash: string;
	isOnBlockchain: boolean;
	isRecalled: boolean;
	createdBy: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
	status: EnrollmentStatus;
	wizardState: any; // Dynamic dict for UI state tracking (FIX-004)
}

const batchSchema = new Schema<IBatch>(
	{
		batchNumber: {
			type: String,
			// Required set to false to support early "Draft" initiation (FIX-001)
			required: false,
			trim: true,
		},
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed'],
			default: 'pending',
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
		customerVisibleImages: {
			type: [Number],
			default: [],
		},
		// Batch-specific
		quantity: {
			type: Number,
			required: false, // Draft support
			min: 1,
		},
		manufactureDate: {
			type: Date,
			required: false, // Draft support
		},
		expiryDate: {
			type: Date,
			required: false, // Draft support
		},
		description: {
			type: String,
			trim: true,
		},
		batchSalt: {
			type: String,
			required: false, // Draft support
			unique: true,
			sparse: true, // Allow multiple drafts with null salt
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
		// Dynamic Wizard State: Stores the full UI context for resuming (FIX-004)
		wizardState: {
			type: Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
		collection: 'batches',
	},
);

// Compound unique index: same manufacturer shouldn't create duplicate batch numbers
batchSchema.index({ batchNumber: 1, createdBy: 1 }, { unique: true });

const Batch = mongoose.model<IBatch>('Batch', batchSchema);

export default Batch;
