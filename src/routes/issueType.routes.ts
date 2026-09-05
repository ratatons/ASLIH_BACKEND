import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createTicketTypeSchema,
  updateTicketTypeSchema,
  eligibleUsersSchema,
  eligibleTeamsSchema,
} from "../validators/ticketType.schema";
import {
  listIssueTypes,
  getIssueType,
  createIssueType,
  updateIssueType,
  deleteIssueType,
  getEligibleUsers,
  setEligibleUsers,
  getEligibleTeams,
  setEligibleTeams,
} from "../controllers/issueType.controller";

const router = Router();

// Any authenticated user (agent or admin) can list active ticket types
// for the report-issue picker.
router.get("/", requireAuth, listIssueTypes);
router.get("/:id", requireAuth, requirePermission("TICKET_TYPES_VIEW"), getIssueType);
router.post("/", requireAuth, requirePermission("TICKET_TYPES_CREATE"), validate(createTicketTypeSchema), createIssueType);
router.patch("/:id", requireAuth, requirePermission("TICKET_TYPES_UPDATE"), validate(updateTicketTypeSchema), updateIssueType);
router.delete("/:id", requireAuth, requirePermission("TICKET_TYPES_DELETE"), deleteIssueType);

router.get("/:id/eligible-users", requireAuth, requirePermission("TICKET_TYPES_ASSIGN_USERS"), getEligibleUsers);
router.put("/:id/eligible-users", requireAuth, requirePermission("TICKET_TYPES_ASSIGN_USERS"), validate(eligibleUsersSchema), setEligibleUsers);
router.get("/:id/eligible-teams", requireAuth, requirePermission("TICKET_TYPES_ASSIGN_TEAMS"), getEligibleTeams);
router.put("/:id/eligible-teams", requireAuth, requirePermission("TICKET_TYPES_ASSIGN_TEAMS"), validate(eligibleTeamsSchema), setEligibleTeams);

export default router;
