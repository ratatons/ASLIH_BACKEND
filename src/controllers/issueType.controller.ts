import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { TicketType } from "../models/TicketType";
import { TicketTypeUser } from "../models/TicketTypeUser";
import { TicketTypeTeam } from "../models/TicketTypeTeam";
import { User } from "../models/User";
import { Team } from "../models/Team";

export const listIssueTypes = asyncHandler(async (req: Request, res: Response) => {
  // Admin callers with TICKET_TYPES_VIEW can see everything via ?all=true;
  // agents (and the default listing) only see active types.
  const showAll = req.query.all === "true" && req.auth?.permissions.includes("TICKET_TYPES_VIEW");
  const filter = showAll ? {} : { isActive: true };
  const types = await TicketType.find(filter).sort({ name: 1 });
  res.json({ items: serialize(types) });
});

export const getIssueType = asyncHandler(async (req: Request, res: Response) => {
  const type = await TicketType.findById(req.params.id);
  if (!type) throw ApiError.notFound("Ticket type not found.");
  res.json(serialize(type));
});

export const createIssueType = asyncHandler(async (req: Request, res: Response) => {
  const type = await TicketType.create(req.body);
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TICKET_TYPE_CREATED",
    entityType: "TicketType",
    entityId: type._id.toString(),
    metadata: { name: type.name },
  });
  res.status(201).json(serialize(type));
});

export const updateIssueType = asyncHandler(async (req: Request, res: Response) => {
  const type = await TicketType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!type) throw ApiError.notFound("Ticket type not found.");
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TICKET_TYPE_UPDATED",
    entityType: "TicketType",
    entityId: type._id.toString(),
    metadata: req.body,
  });
  res.json(serialize(type));
});

export const deleteIssueType = asyncHandler(async (req: Request, res: Response) => {
  const type = await TicketType.findByIdAndDelete(req.params.id);
  if (!type) throw ApiError.notFound("Ticket type not found.");
  await TicketTypeUser.deleteMany({ ticketTypeId: type._id });
  await TicketTypeTeam.deleteMany({ ticketTypeId: type._id });
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TICKET_TYPE_DELETED",
    entityType: "TicketType",
    entityId: type._id.toString(),
    metadata: { name: type.name },
  });
  res.status(204).send();
});

export const getEligibleUsers = asyncHandler(async (req: Request, res: Response) => {
  const links = await TicketTypeUser.find({ ticketTypeId: req.params.id }).populate("userId");
  res.json({ items: serialize(links.map((l) => l.userId)) });
});

export const setEligibleUsers = asyncHandler(async (req: Request, res: Response) => {
  const typeId = req.params.id;
  const type = await TicketType.findById(typeId);
  if (!type) throw ApiError.notFound("Ticket type not found.");

  const { userIds } = req.body as { userIds: string[] };
  const validUsers = await User.find({ _id: { $in: userIds } }).select("_id");
  const validIds = new Set(validUsers.map((u) => u._id.toString()));
  const filteredIds = userIds.filter((id) => validIds.has(id));

  await TicketTypeUser.deleteMany({ ticketTypeId: typeId });
  if (filteredIds.length) {
    await TicketTypeUser.insertMany(filteredIds.map((userId) => ({ ticketTypeId: typeId, userId })));
  }

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TICKET_TYPE_ELIGIBLE_USERS_UPDATED",
    entityType: "TicketType",
    entityId: typeId,
    metadata: { userIds: filteredIds },
  });

  res.json({ userIds: filteredIds });
});

export const getEligibleTeams = asyncHandler(async (req: Request, res: Response) => {
  const links = await TicketTypeTeam.find({ ticketTypeId: req.params.id }).populate("teamId");
  res.json({ items: serialize(links.map((l) => l.teamId)) });
});

export const setEligibleTeams = asyncHandler(async (req: Request, res: Response) => {
  const typeId = req.params.id;
  const type = await TicketType.findById(typeId);
  if (!type) throw ApiError.notFound("Ticket type not found.");

  const { teamIds } = req.body as { teamIds: string[] };
  const validTeams = await Team.find({ _id: { $in: teamIds } }).select("_id");
  const validIds = new Set(validTeams.map((t) => t._id.toString()));
  const filteredIds = teamIds.filter((id) => validIds.has(id));

  await TicketTypeTeam.deleteMany({ ticketTypeId: typeId });
  if (filteredIds.length) {
    await TicketTypeTeam.insertMany(filteredIds.map((teamId) => ({ ticketTypeId: typeId, teamId })));
  }

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TICKET_TYPE_ELIGIBLE_TEAMS_UPDATED",
    entityType: "TicketType",
    entityId: typeId,
    metadata: { teamIds: filteredIds },
  });

  res.json({ teamIds: filteredIds });
});

/** Used by the assignment flow to verify an agent may be assigned a given ticket type. */
export async function isAgentEligibleForTicketType(ticketTypeId: string, agentUserId: string, teamId?: string | null): Promise<boolean> {
  const directlyEligible = await TicketTypeUser.exists({ ticketTypeId, userId: agentUserId });
  if (directlyEligible) return true;

  if (teamId) {
    const teamEligible = await TicketTypeTeam.exists({ ticketTypeId, teamId });
    if (teamEligible) return true;
  }

  // If no eligibility restrictions have been configured at all for this
  // ticket type, treat it as open to any active agent.
  const hasAnyUserRestriction = await TicketTypeUser.exists({ ticketTypeId });
  const hasAnyTeamRestriction = await TicketTypeTeam.exists({ ticketTypeId });
  if (!hasAnyUserRestriction && !hasAnyTeamRestriction) return true;

  return false;
}
