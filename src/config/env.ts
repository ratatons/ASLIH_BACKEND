import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI: required("MONGODB_URI", "mongodb://localhost:27017/aslih"),
  JWT_SECRET: required("JWT_SECRET", "dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me"),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || "15m",
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || "30d",
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:19006")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  ARRIVAL_RADIUS_METERS: parseFloat(process.env.ARRIVAL_RADIUS_METERS || "50"),
  STORAGE_DRIVER: (process.env.STORAGE_DRIVER || "local") as "local" | "s3",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  S3: {
    ENDPOINT: process.env.S3_ENDPOINT || "",
    REGION: process.env.S3_REGION || "",
    BUCKET: process.env.S3_BUCKET || "",
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
    PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || "",
  },
  isProd: process.env.NODE_ENV === "production",
};
