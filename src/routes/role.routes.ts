import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createRoleSchema, updateRoleSchema, addPermissionsSchema } from "../validators/role.schema";
import {
  listPermissions,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  addRolePermissions,
  removeRolePermission,
} from "../controllers/role.controller";

const router = Router();

router.get("/", requireAuth, requirePermission("ROLES_VIEW"), listRoles);
router.get("/:id", requireAuth, requirePermission("ROLES_VIEW"), getRole);
router.post("/", requireAuth, requirePermission("ROLES_CREATE"), validate(createRoleSchema), createRole);
router.patch("/:id", requireAuth, requirePermission("ROLES_UPDATE"), validate(updateRoleSchema), updateRole);
router.delete("/:id", requireAuth, requirePermission("ROLES_DELETE"), deleteRole);

router.post("/:id/permissions", requireAuth, requirePermission("ROLES_UPDATE"), validate(addPermissionsSchema), addRolePermissions);
router.delete("/:id/permissions/:permissionId", requireAuth, requirePermission("ROLES_UPDATE"), removeRolePermission);

export default router;
