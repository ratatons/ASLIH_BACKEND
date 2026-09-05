import { z } from "zod";
import { objectId } from "./common.schema";

export const createTicketTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(120).optional(),
  isActive: z.boolean().optional(),
});

export const updateTicketTypeSchema = createTicketTypeSchema.partial();

export const eligibleUsersSchema = z.object({
  userIds: z.array(objectId).max(500),
});

export const eligibleTeamsSchema = z.object({
  teamIds: z.array(objectId).max(500),
});
