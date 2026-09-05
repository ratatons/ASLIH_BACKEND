import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadSingleImage } from "../middleware/upload";
import {
  createIssueSchema,
  listIssuesQuerySchema,
  assignIssueSchema,
  startMaintenanceSchema,
  completeIssueSchema,
  mapQuerySchema,
} from "../validators/issue.schema";
import {
  createIssue,
  uploadIssuePhoto,
  listIssues,
  getIssue,
  getIssueHistory,
  getIssuesMap,
  assignIssue,
  startMaintenance,
  completeIssue,
} from "../controllers/issue.controller";

const router = Router();

router.post("/", requireAuth, requirePermission("TICKETS_CREATE"), validate(createIssueSchema), createIssue);
router.post("/:id/photos", requireAuth, uploadSingleImage, uploadIssuePhoto);

router.get("/map", requireAuth, requirePermission("MAP_VIEW"), validate(mapQuerySchema, "query"), getIssuesMap);
router.get("/", requireAuth, requirePermission("TICKETS_VIEW"), validate(listIssuesQuerySchema, "query"), listIssues);
router.get("/:id", requireAuth, requirePermission("TICKETS_VIEW"), getIssue);
router.get("/:id/history", requireAuth, requirePermission("TICKETS_VIEW"), getIssueHistory);

router.patch("/:id/assign", requireAuth, requirePermission("TICKETS_ASSIGN"), validate(assignIssueSchema), assignIssue);
router.post(
  "/:id/start-maintenance",
  requireAuth,
  requirePermission("TICKETS_CHANGE_STATUS", "TICKETS_UPDATE"),
  validate(startMaintenanceSchema),
  startMaintenance
);
router.post(
  "/:id/complete",
  requireAuth,
  requirePermission("TICKETS_CHANGE_STATUS", "TICKETS_UPDATE"),
  validate(completeIssueSchema),
  completeIssue
);

export default router;
