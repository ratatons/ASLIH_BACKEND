import { Schema, model, Document, Types } from "mongoose";

export const ISSUE_PHOTO_TYPES = ["REPORT", "COMPLETION"] as const;
export type IssuePhotoType = (typeof ISSUE_PHOTO_TYPES)[number];

export interface IIssuePhoto extends Document {
  _id: Types.ObjectId;
  issueId: Types.ObjectId;
  type: IssuePhotoType;
  storageKey: string;
  url: string;
  uploadedBy: Types.ObjectId;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
}

const IssuePhotoSchema = new Schema<IIssuePhoto>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    type: { type: String, enum: ISSUE_PHOTO_TYPES, required: true },
    storageKey: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

IssuePhotoSchema.index({ issueId: 1, type: 1 });

export const IssuePhoto = model<IIssuePhoto>("IssuePhoto", IssuePhotoSchema);
