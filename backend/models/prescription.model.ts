import { Schema, model, Document, Types } from 'mongoose';

export interface IPrescription extends Document {
	userId: Types.ObjectId;
	url: string;                   // Storage key (e.g., customer-uploads/xyz.pdf)
	label: string;                 // e.g., "Monthly Checkup March"
	doctorName?: string;
	issuedDate?: Date;
	notes?: string;
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
	},
	{
		timestamps: true,
		collection: 'prescriptions'
	}
);

// Indexes
prescriptionSchema.index({ userId: 1, createdAt: -1 });

const Prescription = model<IPrescription>('Prescription', prescriptionSchema);

export default Prescription;
