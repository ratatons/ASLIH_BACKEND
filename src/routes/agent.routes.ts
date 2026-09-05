import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createAgentSchema, updateAgentSchema } from "../validators/agent.schema";
import { listAgents, getAgent, createAgent, updateAgent, deleteAgent } from "../controllers/agent.controller";

const router = Router();

router.get("/", requireAuth, requirePermission("AGENTS_VIEW"), listAgents);
router.get("/:id", requireAuth, requirePermission("AGENTS_VIEW"), getAgent);
router.post("/", requireAuth, requirePermission("AGENTS_CREATE"), validate(createAgentSchema), createAgent);
router.patch("/:id", requireAuth, requirePermission("AGENTS_UPDATE"), validate(updateAgentSchema), updateAgent);
router.delete("/:id", requireAuth, requirePermission("AGENTS_DELETE"), deleteAgent);

export default router;
