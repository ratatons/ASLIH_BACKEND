import { z } from "zod";
import { objectId, paginationSchema } from "./common.schema";
import { ISSUE_STATUSES } from "../models/Issue";

export const createIssueSchema = z.object({
  issueTypeId: objectId,
  description: z.string().trim().min(3).max(2000),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationAccuracy: z.coerce.number().nonnegative().optional(),
  address: z.string().trim().max(300).optional(),
});

export const listIssuesQuerySchema = paginationSchema.extend({
  status: z.enum(ISSUE_STATUSES).optional(),
  issueType: objectId.optional(),
  agentId: objectId.optional(),
  teamId: objectId.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status", "priority"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const assignIssueSchema = z.object({
  agentId: objectId,
  teamId: objectId,
});

export const startMaintenanceSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationAccuracy: z.coerce.number().nonnegative().optional(),
});

export const completeIssueSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  locationAccuracy: z.coerce.number().nonnegative().optional(),
  resolutionNote: z.string().trim().max(2000).optional(),
});

export const mapQuerySchema = z.object({
  status: z.enum(ISSUE_STATUSES).optional(),
  issueType: objectId.optional(),
  agentId: objectId.optional(),
  teamId: objectId.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
