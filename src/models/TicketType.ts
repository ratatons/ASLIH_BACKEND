import { Schema, model, Document, Types } from "mongoose";

export interface ITicketType extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TicketTypeSchema = new Schema<ITicketType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TicketType = model<ITicketType>("TicketType", TicketTypeSchema);
