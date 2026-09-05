import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listNotifications, markNotificationRead } from "../controllers/notification.controller";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.patch("/:id/read", requireAuth, markNotificationRead);

export default router;
