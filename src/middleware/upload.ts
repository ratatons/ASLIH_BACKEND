import multer from "multer";

// Buffer in memory; the storage utility validates and persists to disk/S3.
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("photo");
