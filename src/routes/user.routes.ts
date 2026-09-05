import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema, updateUserRoleSchema, listUsersQuerySchema } from "../validators/user.schema";
import { listUsers, getUser, createUser, updateUser, updateUserRole } from "../controllers/user.controller";

const router = Router();

router.get("/", requireAuth, requirePermission("USERS_VIEW"), validate(listUsersQuerySchema, "query"), listUsers);
router.get("/:id", requireAuth, requirePermission("USERS_VIEW"), getUser);
router.post("/", requireAuth, requirePermission("USERS_CREATE"), validate(createUserSchema), createUser);
router.patch("/:id", requireAuth, requirePermission("USERS_UPDATE"), validate(updateUserSchema), updateUser);
router.patch("/:id/role", requireAuth, requirePermission("USERS_ASSIGN_ROLE"), validate(updateUserRoleSchema), updateUserRole);

export default router;
