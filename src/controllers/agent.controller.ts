import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { AgentProfile } from "../models/AgentProfile";
import { User } from "../models/User";

export const listAgents = asyncHandler(async (req: Request, res: Response) => {
  const agents = await AgentProfile.find().populate("userId").populate("teamId").sort({ createdAt: -1 });
  res.json({ items: serialize(agents) });
});

export const getAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await AgentProfile.findById(req.params.id).populate("userId").populate("teamId");
  if (!agent) throw ApiError.notFound("Agent not found.");
  res.json(serialize(agent));
});

export const createAgent = asyncHandler(async (req: Request, res: Response) => {
  const { userId, teamId, employeeNumber, isAvailable } = req.body;

  const user = await User.findById(userId);
  if (!user) throw ApiError.badRequest("Selected user does not exist.");

  const existing = await AgentProfile.findOne({ userId });
  if (existing) throw ApiError.conflict("This user already has an agent profile.");

  const agent = await AgentProfile.create({ userId, teamId, employeeNumber, isAvailable });

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "AGENT_CREATED",
    entityType: "AgentProfile",
    entityId: agent._id.toString(),
    metadata: { userId, employeeNumber },
  });

  res.status(201).json(serialize(agent));
});

export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await AgentProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!agent) throw ApiError.notFound("Agent not found.");

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "AGENT_UPDATED",
    entityType: "AgentProfile",
    entityId: agent._id.toString(),
    metadata: req.body,
  });

  res.json(serialize(agent));
});

export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
  const agent = await AgentProfile.findByIdAndDelete(req.params.id);
  if (!agent) throw ApiError.notFound("Agent not found.");

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "AGENT_DELETED",
    entityType: "AgentProfile",
    entityId: agent._id.toString(),
    metadata: {},
  });

  res.status(204).send();
});
