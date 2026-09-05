import { z } from "zod";
import { objectId } from "./common.schema";

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  isEnabled: z.boolean().optional(),
  permissionIds: z.array(objectId).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  isEnabled: z.boolean().optional(),
});

export const addPermissionsSchema = z.object({
  permissionIds: z.array(objectId).min(1),
});
