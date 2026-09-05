import { Router } from "express";
import authRoutes from "./auth.routes";
import issueTypeRoutes from "./issueType.routes";
import issueRoutes from "./issue.routes";
import agentIssueRoutes from "./agentIssue.routes";
import agentRoutes from "./agent.routes";
import teamRoutes from "./team.routes";
import userRoutes from "./user.routes";
import roleRoutes from "./role.routes";
import permissionRoutes from "./permission.routes";
import notificationRoutes from "./notification.routes";
import auditLogRoutes from "./auditLog.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/issue-types", issueTypeRoutes);
router.use("/issues", issueRoutes);
router.use("/agent", agentIssueRoutes);
router.use("/agents", agentRoutes);
router.use("/teams", teamRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
