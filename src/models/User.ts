import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  isActive: boolean;
  roles: Types.ObjectId[]; // UserRole relationship, embedded for query simplicity
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: true },
    isActive: { type: Boolean, default: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "Role", default: [] }],
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
