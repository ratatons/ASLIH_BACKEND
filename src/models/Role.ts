import { Schema, model, Document, Types } from "mongoose";

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isSystem: boolean;
  isEnabled: boolean;
  permissions: Types.ObjectId[]; // RolePermission relationship, embedded
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    isSystem: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission", default: [] }],
  },
  { timestamps: true }
);

export const Role = model<IRole>("Role", RoleSchema);
