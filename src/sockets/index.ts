import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../config/logger";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Authentication required."));
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    // Personal room for direct notifications (e.g. issue.assigned to a specific agent)
    socket.join(`user:${userId}`);
    // Broadcast room for admin/agent dashboards that want all ticket events
    socket.join("tickets:all");

    logger.debug({ userId, socketId: socket.id }, "socket connected");

    socket.on("disconnect", () => {
      logger.debug({ userId, socketId: socket.id }, "socket disconnected");
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO has not been initialized yet.");
  return io;
}

// Emits to everyone (admin dashboards, general ticket feeds)
export function emitBroadcast(event: string, payload: unknown) {
  io?.to("tickets:all").emit(event, payload);
}

// Emits to a single user's personal room (targeted notifications)
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
