import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import apiRouter from "./routes";
import healthRoutes from "./routes/health.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";
import { openapiSpec } from "./docs/openapi";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests (no Origin header) and any
        // configured CORS_ORIGINS entry. Reject everything else.
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProd ? "combined" : "dev"));
  app.use(generalLimiter);

  // Static file serving for locally-stored uploads (STORAGE_DRIVER=local).
  app.use(`/${env.UPLOAD_DIR}`, express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get("/api/docs.json", (_req, res) => res.json(openapiSpec));

  app.use("/health", healthRoutes);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
