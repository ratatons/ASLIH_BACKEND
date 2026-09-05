import { Schema, model, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorUserId: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false, capped: undefined }
);

// Immutable log: no update timestamps; writes are append-only by convention
// (no update/delete routes are exposed for this collection).
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ actorUserId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);
