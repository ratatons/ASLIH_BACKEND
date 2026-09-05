import { Schema, model, Document, Types } from "mongoose";

export interface IStatusHistory extends Document {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  fromStatus: string | null;
  toStatus: string;
  changedBy: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StatusHistorySchema.index({ issueId: 1, createdAt: 1 });

export const StatusHistory = model<IStatusHistory>("StatusHistory", StatusHistorySchema);
