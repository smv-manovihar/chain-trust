import mongoose, { Document, Schema } from 'mongoose';

export interface ISuspiciousScan extends Document {
	saltValue: string;
	brandId?: string;
	location?: string;
	ipAddress?: string;
	userAgent?: string;
	createdAt: Date;
}

const suspiciousScanSchema = new Schema<ISuspiciousScan>(
	{
		saltValue: {
			type: String,
			required: true,
			trim: true,
		},
		brandId: {
			type: String,
			trim: true,
		},
		location: {
			type: String,
			trim: true,
		},
		ipAddress: {
			type: String,
			trim: true,
		},
		userAgent: {
			type: String,
			trim: true,
		}
	},
	{
		timestamps: true,
	},
);

export const SuspiciousScan = mongoose.model<ISuspiciousScan>('SuspiciousScan', suspiciousScanSchema);
