import { Notification } from "../models/Notification";
import { emitToUser, emitBroadcast } from "../sockets";
import { serialize } from "./serialize";

export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  issueId?: string | null;
}) {
  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    issueId: params.issueId || null,
  });
  emitToUser(params.userId, "notification.created", serialize(notification));
  return notification;
}

export function broadcastIssueEvent(event: string, payload: unknown) {
  emitBroadcast(event, payload);
}
