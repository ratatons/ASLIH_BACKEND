import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { analyticsDashboard, analyticsSummary } from "../controllers/analytics.controller";

const router = Router();

router.get("/dashboard", requireAuth, requirePermission("ANALYTICS_VIEW"), analyticsDashboard);
router.get("/summary", requireAuth, requirePermission("ANALYTICS_VIEW"), analyticsSummary);

export default router;
