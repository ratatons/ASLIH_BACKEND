import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { notifyUser, broadcastIssueEvent } from "../utils/notify";
import { generateTicketCode } from "../utils/ticketCode";
import { distanceMeters } from "../utils/geo";
import { saveIssuePhoto } from "../utils/storage";
import { env } from "../config/env";
import { Issue } from "../models/Issue";
import { IssuePhoto } from "../models/IssuePhoto";
import { StatusHistory } from "../models/StatusHistory";
import { TicketType } from "../models/TicketType";
import { User } from "../models/User";
import { AgentProfile } from "../models/AgentProfile";
import { Team } from "../models/Team";
import { isAgentEligibleForTicketType } from "./issueType.controller";

async function recordStatusChange(issueId: string, fromStatus: string | null, toStatus: string, changedBy: string, note?: string) {
  await StatusHistory.create({ issueId, fromStatus, toStatus, changedBy, note });
}

// ---------------------------------------------------------------------------
// POST /api/issues — Agent A reports a new issue
// ---------------------------------------------------------------------------
export const createIssue = asyncHandler(async (req: Request, res: Response) => {
  const { issueTypeId, description, latitude, longitude, locationAccuracy, address } = req.body;

  const issueType = await TicketType.findById(issueTypeId);
  if (!issueType || !issueType.isActive) {
    throw ApiError.badRequest("Selected ticket type is not available.");
  }

  // reportedByAgentId is ALWAYS derived from the authenticated user, never the request body.
  const reportedByAgentId = req.auth!.userId;

  const ticketCode = await generateTicketCode();

  const issue = await Issue.create({
    ticketCode,
    reportedByAgentId,
    issueTypeId,
    description,
    status: "NEW",
    location: { type: "Point", coordinates: [longitude, latitude] },
    locationAccuracy,
    address,
  });

  await recordStatusChange(issue._id.toString(), null, "NEW", reportedByAgentId, "Issue reported");
  await writeAuditLog({
    actorUserId: reportedByAgentId,
    action: "ISSUE_CREATED",
    entityType: "Issue",
    entityId: issue._id.toString(),
    metadata: { ticketCode, issueTypeId },
  });

  broadcastIssueEvent("issue.created", serialize(issue));

  res.status(201).json(serialize(issue));
});

// ---------------------------------------------------------------------------
// POST /api/issues/:id/photos — attach a REPORT or COMPLETION photo
// ---------------------------------------------------------------------------
export const uploadIssuePhoto = asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw ApiError.notFound("Ticket not found.");

  const type = (req.body.type === "COMPLETION" ? "COMPLETION" : "REPORT") as "REPORT" | "COMPLETION";

  // Authorization: only the reporting agent may attach a REPORT photo, and
  // only the currently assigned agent may attach a COMPLETION photo. This
  // prevents arbitrary users from attaching files to arbitrary issues.
  const userId = req.auth!.userId;
  if (type === "REPORT" && issue.reportedByAgentId.toString() !== userId) {
    throw ApiError.forbidden("Only the reporting agent can attach a report photo.");
  }
  if (type === "COMPLETION" && issue.assignedAgentId?.toString() !== userId) {
    throw ApiError.forbidden("Only the assigned agent can attach a completion photo.");
  }

  const file = req.file;
  if (!file) throw ApiError.badRequest("A photo file is required.");

  const stored = await saveIssuePhoto(issue._id.toString(), {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    size: file.size,
  });

  const latitude = req.body.latitude !== undefined ? Number(req.body.latitude) : undefined;
  const longitude = req.body.longitude !== undefined ? Number(req.body.longitude) : undefined;

  const photo = await IssuePhoto.create({
    issueId: issue._id,
    type,
    storageKey: stored.storageKey,
    url: stored.url,
    uploadedBy: userId,
    latitude,
    longitude,
  });

  res.status(201).json(serialize(photo));
});

// ---------------------------------------------------------------------------
// GET /api/issues — admin listing with filters/pagination
// ---------------------------------------------------------------------------
export const listIssues = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, status, issueType, agentId, teamId, dateFrom, dateTo, search, sortBy, sortDir } = req.query as any;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (issueType) filter.issueTypeId = issueType;
  if (agentId) filter.assignedAgentId = agentId;
  if (teamId) filter.assignedTeamId = teamId;
  if (dateFrom || dateTo) {
    filter.createdAt = {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    };
  }
  if (search) {
    filter.$or = [
      { ticketCode: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  const sort: Record<string, 1 | -1> = { [sortBy]: sortDir === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Issue.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("issueTypeId")
      .populate("reportedByAgentId")
      .populate("assignedAgentId")
      .populate("assignedTeamId"),
    Issue.countDocuments(filter),
  ]);

  res.json({ items: serialize(items), total, page, pageSize });
});

// ---------------------------------------------------------------------------
// GET /api/agent/issues — tickets assigned to the authenticated agent
// ---------------------------------------------------------------------------
export const listMyIssues = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, status } = req.query as any;
  const filter: Record<string, unknown> = { assignedAgentId: req.auth!.userId };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .populate("issueTypeId"),
    Issue.countDocuments(filter),
  ]);

  res.json({ items: serialize(items), total, page: Number(page), pageSize: Number(pageSize) });
});

// ---------------------------------------------------------------------------
// GET /api/agent/issues/:id — agent detail, verifies assignment server-side
// ---------------------------------------------------------------------------
export const getMyIssue = asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findById(req.params.id)
    .populate("issueTypeId")
    .populate("reportedByAgentId")
    .populate("assignedAgentId")
    .populate("assignedTeamId");
  if (!issue) throw ApiError.notFound("Ticket not found.");

  const reportedBy = issue.reportedByAgentId as unknown as { _id?: { toString(): string } } | undefined;
  const assignedAgent = issue.assignedAgentId as unknown as { _id?: { toString(): string } } | undefined;
  const isReporter = reportedBy?._id?.toString?.() === req.auth!.userId;
  const isAssignee = assignedAgent?._id?.toString?.() === req.auth!.userId;
  if (!isReporter && !isAssignee) {
    throw ApiError.forbidden("You are not associated with this ticket.");
  }

  const photos = await IssuePhoto.find({ issueId: issue._id }).sort({ createdAt: 1 });
  res.json({ ...serialize(issue), photos: serialize(photos) });
});

// ---------------------------------------------------------------------------
// GET /api/issues/:id — full admin detail
// ---------------------------------------------------------------------------
export const getIssue = asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findById(req.params.id)
    .populate("issueTypeId")
    .populate("reportedByAgentId")
    .populate("assignedAgentId")
    .populate("assignedTeamId");
  if (!issue) throw ApiError.notFound("Ticket not found.");

  const [photos, history] = await Promise.all([
    IssuePhoto.find({ issueId: issue._id }).sort({ createdAt: 1 }),
    StatusHistory.find({ issueId: issue._id }).sort({ createdAt: 1 }).populate("changedBy"),
  ]);

  res.json({
    ...serialize(issue),
    photos: serialize(photos),
    statusHistory: serialize(history),
  });
});

// ---------------------------------------------------------------------------
// GET /api/issues/:id/history
// ---------------------------------------------------------------------------
export const getIssueHistory = asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) throw ApiError.notFound("Ticket not found.");
  const history = await StatusHistory.find({ issueId: issue._id }).sort({ createdAt: 1 }).populate("changedBy");
  res.json({ items: serialize(history) });
});

// ---------------------------------------------------------------------------
// GET /api/issues/map
// ---------------------------------------------------------------------------
export const getIssuesMap = asyncHandler(async (req: Request, res: Response) => {
  const { status, issueType, agentId, teamId, dateFrom, dateTo } = req.query as any;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (issueType) filter.issueTypeId = issueType;
  if (agentId) filter.assignedAgentId = agentId;
  if (teamId) filter.assignedTeamId = teamId;
  if (dateFrom || dateTo) {
    filter.createdAt = {
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    };
  }

  const items = await Issue.find(filter)
    .select("ticketCode status priority location address issueTypeId assignedAgentId assignedTeamId createdAt")
    .populate("issueTypeId")
    .limit(5000);

  res.json({ items: serialize(items) });
});

// ---------------------------------------------------------------------------
// PATCH /api/issues/:id/assign
// ---------------------------------------------------------------------------
export const assignIssue = asyncHandler(async (req: Request, res: Response) => {
  const { agentId, teamId } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) throw ApiError.notFound("Ticket not found.");
  if (issue.status !== "NEW") {
    throw ApiError.conflict(`Ticket cannot be assigned from status ${issue.status}.`);
  }

  const [agentUser, agentProfile, team] = await Promise.all([
    User.findById(agentId),
    AgentProfile.findOne({ userId: agentId }),
    Team.findById(teamId),
  ]);

  if (!agentUser || !agentUser.isActive) throw ApiError.badRequest("Selected agent does not exist or is inactive.");
  if (!agentProfile) throw ApiError.badRequest("Selected user is not an agent.");
  if (!team) throw ApiError.badRequest("Selected team does not exist.");

  const eligible = await isAgentEligibleForTicketType(issue.issueTypeId.toString(), agentId, teamId);
  if (!eligible) {
    throw ApiError.forbidden("Selected agent is not eligible for this ticket type.");
  }

  issue.status = "ASSIGNED";
  issue.assignedAgentId = new Types.ObjectId(agentId);
  issue.assignedTeamId = new Types.ObjectId(teamId);
  issue.assignedAt = new Date();
  await issue.save();

  await recordStatusChange(issue._id.toString(), "NEW", "ASSIGNED", req.auth!.userId, `Assigned to agent ${agentId}`);
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ISSUE_ASSIGNED",
    entityType: "Issue",
    entityId: issue._id.toString(),
    metadata: { agentId, teamId },
  });

  await notifyUser({
    userId: agentId,
    type: "ISSUE_ASSIGNED",
    title: "New ticket assigned",
    message: `You have been assigned ticket ${issue.ticketCode}.`,
    issueId: issue._id.toString(),
  });

  broadcastIssueEvent("issue.assigned", serialize(issue));

  res.json(serialize(issue));
});

// ---------------------------------------------------------------------------
// POST /api/issues/:id/start-maintenance
// ---------------------------------------------------------------------------
export const startMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, locationAccuracy } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) throw ApiError.notFound("Ticket not found.");

  if (issue.assignedAgentId?.toString() !== req.auth!.userId) {
    throw ApiError.forbidden("You are not the assigned agent for this ticket.");
  }
  if (issue.status !== "ASSIGNED") {
    throw ApiError.conflict(`Maintenance cannot start from status ${issue.status}.`);
  }

  const [issueLng, issueLat] = issue.location.coordinates;
  const distance = distanceMeters(latitude, longitude, issueLat, issueLng);
  if (distance > env.ARRIVAL_RADIUS_METERS) {
    throw ApiError.forbidden(
      `You must be within ${env.ARRIVAL_RADIUS_METERS}m of the ticket location to start maintenance (currently ${Math.round(distance)}m away).`
    );
  }

  issue.status = "ON_MAINTENANCE";
  issue.maintenanceStartedAt = new Date();
  issue.maintenanceLocation = { type: "Point", coordinates: [longitude, latitude] };
  issue.maintenanceAccuracy = locationAccuracy ?? null;
  await issue.save();

  await recordStatusChange(issue._id.toString(), "ASSIGNED", "ON_MAINTENANCE", req.auth!.userId, "Maintenance started");
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ISSUE_MAINTENANCE_STARTED",
    entityType: "Issue",
    entityId: issue._id.toString(),
    metadata: { latitude, longitude, distanceMeters: Math.round(distance) },
  });

  broadcastIssueEvent("issue.maintenance_started", serialize(issue));

  res.json(serialize(issue));
});

// ---------------------------------------------------------------------------
// POST /api/issues/:id/complete
// ---------------------------------------------------------------------------
export const completeIssue = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, locationAccuracy, resolutionNote } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) throw ApiError.notFound("Ticket not found.");

  if (issue.assignedAgentId?.toString() !== req.auth!.userId) {
    throw ApiError.forbidden("You are not the assigned agent for this ticket.");
  }
  if (issue.status !== "ON_MAINTENANCE") {
    throw ApiError.conflict(`Ticket cannot be completed from status ${issue.status}.`);
  }

  const completionPhotoCount = await IssuePhoto.countDocuments({ issueId: issue._id, type: "COMPLETION" });
  if (completionPhotoCount === 0) {
    throw ApiError.badRequest("A completion photo is required before this ticket can be marked fixed.");
  }

  issue.status = "FIXED";
  issue.fixedAt = new Date();
  issue.completionLocation = { type: "Point", coordinates: [longitude, latitude] };
  issue.completionAccuracy = locationAccuracy ?? null;
  issue.resolutionNote = resolutionNote ?? null;
  await issue.save();

  await recordStatusChange(issue._id.toString(), "ON_MAINTENANCE", "FIXED", req.auth!.userId, "Ticket completed");
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ISSUE_FIXED",
    entityType: "Issue",
    entityId: issue._id.toString(),
    metadata: { latitude, longitude },
  });

  await notifyUser({
    userId: issue.reportedByAgentId.toString(),
    type: "ISSUE_FIXED",
    title: "Ticket resolved",
    message: `Ticket ${issue.ticketCode} has been marked as fixed.`,
    issueId: issue._id.toString(),
  });

  broadcastIssueEvent("issue.fixed", serialize(issue));

  res.json(serialize(issue));
});
