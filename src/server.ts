import http from "http";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./sockets";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { runSeed } from "./seed";

async function main() {
  await connectDB();
  await runSeed(); // idempotent: seeds permissions/roles/super-admin/ticket types on first boot

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`ASLIH backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
