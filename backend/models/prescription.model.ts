import { Schema, model, Document, Types } from 'mongoose';
import { deleteFile } from '../services/s3.service.js';

export interface IPrescription extends Document {
	userId: Types.ObjectId;
	url: string;                   // Storage key (e.g., customer-uploads/xyz.pdf)
	label: string;                 // e.g., "Monthly Checkup March"
	doctorName?: string;
	issuedDate?: Date;
	notes?: string;
	content?: string;                  // Digitized text content
	status: 'pending' | 'processing' | 'completed' | 'failed';
	createdAt: Date;
	updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		url: { type: String, required: true },
		label: { type: String, required: true },
		doctorName: { type: String, trim: true },
		issuedDate: { type: Date },
		notes: { type: String, trim: true },
		content: { type: String, default: '' },
		status: { 
			type: String, 
			enum: ['pending', 'processing', 'completed', 'failed'], 
			default: 'pending' 
		},
	},
	{
		timestamps: true,
		collection: 'prescriptions'
	}
);

// Middleware to clean up S3 file on deletion
prescriptionSchema.post('findOneAndDelete', async function (doc) {
	if (doc && doc.url) {
		try {
			await deleteFile(doc.url);
		} catch (error) {
			console.error(`Failed to delete S3 prescription file: ${doc.url}`, error);
		}
	}
});

// Indexes
prescriptionSchema.index({ userId: 1, createdAt: -1 });

const Prescription = model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
