import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScan extends Document {
	batch: Types.ObjectId;
	unitIndex: number;
	visitorId: string; // Anonymous UUID from frontend
	user?: Types.ObjectId; // Populated if logged in
	ip?: string;
	userAgent?: string;
	latitude?: number;
	longitude?: number;
	city?: string;
	country?: string;
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
		visitorId: {
			type: String,
			required: true,
			trim: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		ip: { type: String, trim: true },
		userAgent: { type: String, trim: true },
		latitude: { type: Number },
		longitude: { type: Number },
		city: { type: String, trim: true },
		country: { type: String, trim: true },
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
		collection: 'scans',
	},
);

// Unique index to ensure one visitor only counts as one scan for a specific unit
scanSchema.index({ batch: 1, unitIndex: 1, visitorId: 1 }, { unique: true });

const Scan = mongoose.model<IScan>('Scan', scanSchema);

export default Scan;
