import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { listPermissions } from "../controllers/role.controller";

const router = Router();

// GET /api/permissions - flat catalog of all available permission keys,
// used by the Admin app to build role-editing UIs dynamically.
router.get("/", requireAuth, requirePermission("ROLES_VIEW"), listPermissions);

export default router;
