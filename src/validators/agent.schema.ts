import { z } from "zod";
import { objectId } from "./common.schema";

export const createAgentSchema = z.object({
  userId: objectId,
  teamId: objectId.optional(),
  employeeNumber: z.string().trim().min(1).max(60),
  isAvailable: z.boolean().optional(),
});

export const updateAgentSchema = z.object({
  teamId: objectId.nullable().optional(),
  employeeNumber: z.string().trim().min(1).max(60).optional(),
  isAvailable: z.boolean().optional(),
});
