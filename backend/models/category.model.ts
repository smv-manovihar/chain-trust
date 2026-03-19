import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
	name: string;
	description?: string;
	createdBy: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

// Same manufacturer can't have duplicate category names
categorySchema.index({ name: 1, createdBy: 1 }, { unique: true });

export default mongoose.model<ICategory>('Category', categorySchema);
