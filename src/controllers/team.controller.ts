import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { Team } from "../models/Team";

export const listTeams = asyncHandler(async (req: Request, res: Response) => {
  const teams = await Team.find().sort({ name: 1 });
  res.json({ items: serialize(teams) });
});

export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findById(req.params.id);
  if (!team) throw ApiError.notFound("Team not found.");
  res.json(serialize(team));
});

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.create(req.body);
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TEAM_CREATED",
    entityType: "Team",
    entityId: team._id.toString(),
    metadata: { name: team.name },
  });
  res.status(201).json(serialize(team));
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!team) throw ApiError.notFound("Team not found.");
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TEAM_UPDATED",
    entityType: "Team",
    entityId: team._id.toString(),
    metadata: req.body,
  });
  res.json(serialize(team));
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findByIdAndDelete(req.params.id);
  if (!team) throw ApiError.notFound("Team not found.");
  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "TEAM_DELETED",
    entityType: "Team",
    entityId: team._id.toString(),
    metadata: { name: team.name },
  });
  res.status(204).send();
});
