import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createTeamSchema, updateTeamSchema } from "../validators/team.schema";
import { listTeams, getTeam, createTeam, updateTeam, deleteTeam } from "../controllers/team.controller";

const router = Router();

router.get("/", requireAuth, requirePermission("TEAMS_VIEW"), listTeams);
router.get("/:id", requireAuth, requirePermission("TEAMS_VIEW"), getTeam);
router.post("/", requireAuth, requirePermission("TEAMS_CREATE"), validate(createTeamSchema), createTeam);
router.patch("/:id", requireAuth, requirePermission("TEAMS_UPDATE"), validate(updateTeamSchema), updateTeam);
router.delete("/:id", requireAuth, requirePermission("TEAMS_DELETE"), deleteTeam);

export default router;
