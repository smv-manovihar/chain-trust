import { Schema, model, Document, Types } from 'mongoose';

export interface IDosageLog extends Document {
  userId: Types.ObjectId;
  cabinetItemId: Types.ObjectId;
  timestamp: Date;
  doseAmount: number; // For future multi-dose support
  inventoryBefore: number;
  wasPunctual: boolean; // true if within 3h window
}

const dosageLogSchema = new Schema<IDosageLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cabinetItemId: { type: Schema.Types.ObjectId, ref: 'CabinetItem', required: true },
    timestamp: { type: Date, default: Date.now },
    doseAmount: { type: Number, default: 1 },
    inventoryBefore: { type: Number, required: true },
    wasPunctual: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'dosage_logs',
  }
);

// Index for fast lookups of most recent doses per medicine
dosageLogSchema.index({ cabinetItemId: 1, timestamp: -1 });
dosageLogSchema.index({ userId: 1, timestamp: -1 });

const DosageLog = model<IDosageLog>('DosageLog', dosageLogSchema);

export default DosageLog;
