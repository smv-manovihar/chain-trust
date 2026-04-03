import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScan extends Document {
	batch: Types.ObjectId;
	manufacturer: Types.ObjectId; // Denormalized for high-speed analytics
	unitIndex: number;
	visitorId: string; // Anonymous UUID from frontend
	user?: Types.ObjectId; // Populated if logged in
	ip?: string;
	userAgent?: string;
	latitude?: number;
	longitude?: number;
	city?: string;
	country?: string;
	isSuspicious: boolean;
	suspiciousReason?: string;
	createdAt: Date;
}

const scanSchema = new Schema<IScan>(
	{
		batch: {
			type: Schema.Types.ObjectId,
			ref: 'Batch',
			required: true,
		},
		manufacturer: {
			type: Schema.Types.ObjectId,
			ref: 'User',
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
		isSuspicious: { type: Boolean, default: false },
		suspiciousReason: { type: String, trim: true },
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
		collection: 'scans',
	},
);

// Analytics Index: Optimized for time-series filtering per manufacturer
scanSchema.index({ manufacturer: 1, createdAt: -1 });

// Unique index to ensure one visitor only counts as one scan for a specific unit
scanSchema.index({ batch: 1, unitIndex: 1, visitorId: 1 }, { unique: true });

const Scan = mongoose.model<IScan>('Scan', scanSchema);

export default Scan;
