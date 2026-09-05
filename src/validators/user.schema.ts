import { z } from "zod";
import { objectId, paginationSchema } from "./common.schema";

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(8).max(128),
  roleIds: z.array(objectId).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserRoleSchema = z.object({
  roleIds: z.array(objectId),
});

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  roleId: objectId.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
