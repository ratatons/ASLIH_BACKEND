import { Schema, model, Document, Types } from "mongoose";

export interface ITicketTypeUser extends Document {
  _id: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  userId: Types.ObjectId;
}

const TicketTypeUserSchema = new Schema<ITicketTypeUser>({
  ticketTypeId: { type: Schema.Types.ObjectId, ref: "TicketType", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

TicketTypeUserSchema.index({ ticketTypeId: 1, userId: 1 }, { unique: true });

export const TicketTypeUser = model<ITicketTypeUser>("TicketTypeUser", TicketTypeUserSchema);
