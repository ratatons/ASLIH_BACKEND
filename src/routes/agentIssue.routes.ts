import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listMyIssues, getMyIssue } from "../controllers/issue.controller";

const router = Router();

// Ticket lifecycle actions for the agent's own tickets reuse the shared
// /api/issues/:id/... routes (assignment is verified server-side there).
router.get("/issues", requireAuth, listMyIssues);
router.get("/issues/:id", requireAuth, getMyIssue);

export default router;
