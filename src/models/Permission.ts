import { Schema, model, Document, Types } from "mongoose";

export interface IPermission extends Document {
  _id: Types.ObjectId;
  key: string;
  label: string;
  module: string;
  action: string;
  createdAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    label: { type: String, required: true },
    module: { type: String, required: true },
    action: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Permission = model<IPermission>("Permission", PermissionSchema);
