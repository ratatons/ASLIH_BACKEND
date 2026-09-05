import { Schema, model, Document, Types } from "mongoose";

export const ISSUE_STATUSES = ["NEW", "ASSIGNED", "ON_MAINTENANCE", "FIXED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface IIssue extends Document {
  _id: Types.ObjectId;
  ticketCode: string;
  reportedByAgentId: Types.ObjectId;
  issueTypeId: Types.ObjectId;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  location: IGeoPoint;
  locationAccuracy?: number;
  address?: string;

  assignedAgentId?: Types.ObjectId | null;
  assignedTeamId?: Types.ObjectId | null;

  maintenanceLocation?: IGeoPoint | null;
  maintenanceAccuracy?: number | null;

  completionLocation?: IGeoPoint | null;
  completionAccuracy?: number | null;
  resolutionNote?: string | null;

  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date | null;
  maintenanceStartedAt?: Date | null;
  fixedAt?: Date | null;
}

const GeoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => Array.isArray(v) && v.length === 2,
        message: "coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const IssueSchema = new Schema<IIssue>(
  {
    ticketCode: { type: String, required: true, unique: true },
    reportedByAgentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issueTypeId: { type: Schema.Types.ObjectId, ref: "TicketType", required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ISSUE_STATUSES, default: "NEW", required: true },
    priority: { type: String, enum: ISSUE_PRIORITIES, default: "NORMAL" },
    location: { type: GeoPointSchema, required: true },
    locationAccuracy: { type: Number },
    address: { type: String, trim: true },

    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },

    maintenanceLocation: { type: GeoPointSchema, default: null },
    maintenanceAccuracy: { type: Number, default: null },

    completionLocation: { type: GeoPointSchema, default: null },
    completionAccuracy: { type: Number, default: null },
    resolutionNote: { type: String, default: null, maxlength: 2000 },

    assignedAt: { type: Date, default: null },
    maintenanceStartedAt: { type: Date, default: null },
    fixedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

IssueSchema.index({ location: "2dsphere" });
IssueSchema.index({ status: 1 });
IssueSchema.index({ issueTypeId: 1 });
IssueSchema.index({ assignedAgentId: 1 });
IssueSchema.index({ assignedTeamId: 1 });
IssueSchema.index({ reportedByAgentId: 1 });
IssueSchema.index({ createdAt: -1 });
IssueSchema.index({ description: "text", address: "text" });

export const Issue = model<IIssue>("Issue", IssueSchema);
