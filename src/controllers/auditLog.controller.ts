import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { serialize } from "../utils/serialize";
import { AuditLog } from "../models/AuditLog";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, entityType, entityId, actorUserId } = req.query as any;

  const filter: Record<string, unknown> = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (actorUserId) filter.actorUserId = actorUserId;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .populate("actorUserId"),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ items: serialize(items), total, page: Number(page), pageSize: Number(pageSize) });
});
