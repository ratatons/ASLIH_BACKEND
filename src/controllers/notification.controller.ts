import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { Notification } from "../models/Notification";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, unreadOnly } = req.query as any;
  const filter: Record<string, unknown> = { userId: req.auth!.userId };
  if (unreadOnly === "true") filter.isRead = false;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize)),
    Notification.countDocuments(filter),
  ]);

  res.json({ items: serialize(items), total, page: Number(page), pageSize: Number(pageSize) });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.auth!.userId });
  if (!notification) throw ApiError.notFound("Notification not found.");

  notification.isRead = true;
  await notification.save();

  res.json(serialize(notification));
});
