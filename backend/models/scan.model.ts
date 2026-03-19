import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScan extends Document {
	batch: Types.ObjectId;
	unitIndex: number;
	viewerId: string; // Combination of IP + Fingerprint
	createdAt: Date;
}

const scanSchema = new Schema<IScan>(
	{
		batch: {
			type: Schema.Types.ObjectId,
			ref: 'Batch',
			required: true,
		},
		unitIndex: {
			type: Number,
			required: true,
		},
		viewerId: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	},
);

// Unique index to ensure one viewer only counts as one scan for a specific unit
scanSchema.index({ batch: 1, unitIndex: 1, viewerId: 1 }, { unique: true });

export default mongoose.model<IScan>('Scan', scanSchema);
