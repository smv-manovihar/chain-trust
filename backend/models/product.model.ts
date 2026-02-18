import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
	name: string;
	category: string;
	brand: string;
	productId: string; // Internal/External ID
	price: number;
	batchNumber: string;
	manufactureDate: Date;
	expiryDate?: Date;
	description: string;
	
	// Blockchain fields
	isOnBlockchain: boolean;
	blockchainHash: string; // Transaction Hash
	saltValue: string; // The salt used for verification
	createdAt: Date;
	updatedAt: Date;

	// Tracking
	timeline: {
		status: string;
		date: Date;
		location: string;
		description?: string;
		updatedBy?: string;
		txHash?: string;
	}[];
}

const productSchema = new Schema<IProduct>(
	{
		name: {
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
		productId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		price: {
			type: Number,
			required: true,
		},
		batchNumber: {
			type: String,
			required: true,
			trim: true,
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
		isOnBlockchain: {
			type: Boolean,
			default: false,
		},
		blockchainHash: {
			type: String,
			trim: true,
		},
		saltValue: {
			type: String,
			trim: true,
		},
		timeline: [
			{
				status: { type: String, required: true },
				date: { type: Date, default: Date.now },
				location: { type: String, required: true },
				description: String,
				updatedBy: String,
				txHash: String,
			},
		],
	},
	{
		timestamps: true,
	},
);

export default mongoose.model<IProduct>('Product', productSchema);
