import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { listAuditLogs } from "../controllers/auditLog.controller";

const router = Router();

router.get("/", requireAuth, requirePermission("AUDIT_LOGS_VIEW"), listAuditLogs);

export default router;
