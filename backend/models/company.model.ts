import { Schema, model, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  _id: Types.ObjectId;
  name: string;
  domain: string;
  policies: {
    require2FA: boolean;
    allowedIPs?: string[];
    passwordComplexity?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
  adminId: Types.ObjectId;
  employees: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    domain: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    policies: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {
        require2FA: false,
        passwordComplexity: 'medium'
      }
    },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Index for domain lookups
companySchema.index({ domain: 1 });

export default model<ICompany>('Company', companySchema, 'Companies');
