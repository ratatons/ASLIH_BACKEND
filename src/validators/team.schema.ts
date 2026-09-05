import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();
