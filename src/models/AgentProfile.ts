import { Schema, model, Document, Types } from "mongoose";

export interface IAgentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  teamId?: Types.ObjectId | null;
  employeeNumber: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentProfileSchema = new Schema<IAgentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    employeeNumber: { type: String, required: true, unique: true, trim: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const AgentProfile = model<IAgentProfile>("AgentProfile", AgentProfileSchema);
