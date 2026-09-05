import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "../config/env";

export interface StoredFile {
  storageKey: string;
  url: string;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function assertValidImage(file: { mimetype: string; originalname: string; size: number }) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    throw Object.assign(new Error("Unsupported file type. Only JPEG, PNG, WEBP or HEIC images are allowed."), {
      status: 400,
    });
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw Object.assign(new Error("File too large. Maximum size is 10MB."), { status: 400 });
  }
}

/**
 * Storage abstraction. Default driver writes to local disk (served statically
 * under /uploads) which works for demos and Render's persistent disk add-on.
 * For production at scale, swap STORAGE_DRIVER=s3 and implement the S3
 * upload branch using your preferred SDK (kept minimal here to avoid an
 * unused hard dependency when S3 is not configured).
 */
export async function saveIssuePhoto(
  issueId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
): Promise<StoredFile> {
  assertValidImage(file);

  const ext = path.extname(file.originalname).toLowerCase();
  const storageKey = `issues/${issueId}/${randomUUID()}${ext}`;

  if (env.STORAGE_DRIVER === "local") {
    const fullDir = path.join(process.cwd(), env.UPLOAD_DIR, "issues", issueId);
    fs.mkdirSync(fullDir, { recursive: true });
    const fullPath = path.join(process.cwd(), env.UPLOAD_DIR, storageKey);
    fs.writeFileSync(fullPath, file.buffer);
    const url = `${env.PUBLIC_BASE_URL}/${env.UPLOAD_DIR}/${storageKey}`;
    return { storageKey, url };
  }

  // S3-compatible branch: implement with @aws-sdk/client-s3 (or similar) using
  // env.S3.* config, then return the public URL under env.S3.PUBLIC_BASE_URL.
  throw Object.assign(new Error("S3 storage driver is not configured in this deployment."), { status: 500 });
}
