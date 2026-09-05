import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Issue } from "../models/Issue";

export const analyticsDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [statusCounts, total] = await Promise.all([
    Issue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Issue.countDocuments(),
  ]);

  const byStatus: Record<string, number> = { NEW: 0, ASSIGNED: 0, ON_MAINTENANCE: 0, FIXED: 0 };
  for (const row of statusCounts) {
    byStatus[row._id] = row.count;
  }

  const resolutionPercentage = total > 0 ? Math.round((byStatus.FIXED / total) * 10000) / 100 : 0;

  const avgResolutionAgg = await Issue.aggregate([
    { $match: { status: "FIXED", fixedAt: { $ne: null } } },
    {
      $project: {
        resolutionMs: { $subtract: ["$fixedAt", "$createdAt"] },
      },
    },
    { $group: { _id: null, avgMs: { $avg: "$resolutionMs" } } },
  ]);
  const averageResolutionTimeMinutes = avgResolutionAgg.length
    ? Math.round((avgResolutionAgg[0].avgMs / 60000) * 100) / 100
    : 0;

  res.json({
    total,
    NEW: byStatus.NEW,
    ASSIGNED: byStatus.ASSIGNED,
    ON_MAINTENANCE: byStatus.ON_MAINTENANCE,
    FIXED: byStatus.FIXED,
    resolutionPercentage,
    averageResolutionTimeMinutes,
  });
});

export const analyticsSummary = asyncHandler(async (_req: Request, res: Response) => {
  const [byType, byAgent, byTeam, byArea] = await Promise.all([
    Issue.aggregate([
      { $group: { _id: "$issueTypeId", count: { $sum: 1 } } },
      { $lookup: { from: "tickettypes", localField: "_id", foreignField: "_id", as: "type" } },
      { $unwind: { path: "$type", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, issueTypeId: "$_id", name: "$type.name", count: 1 } },
    ]),
    Issue.aggregate([
      { $match: { assignedAgentId: { $ne: null } } },
      { $group: { _id: "$assignedAgentId", count: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agent" } },
      { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, agentId: "$_id", fullName: "$agent.fullName", count: 1 } },
    ]),
    Issue.aggregate([
      { $match: { assignedTeamId: { $ne: null } } },
      { $group: { _id: "$assignedTeamId", count: { $sum: 1 } } },
      { $lookup: { from: "teams", localField: "_id", foreignField: "_id", as: "team" } },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, teamId: "$_id", name: "$team.name", count: 1 } },
    ]),
    Issue.aggregate([
      { $match: { address: { $ne: null } } },
      { $group: { _id: "$address", count: { $sum: 1 } } },
      { $project: { _id: 0, area: "$_id", count: 1 } },
      { $limit: 50 },
    ]),
  ]);

  res.json({
    issuesByType: byType.map((r) => ({ issueTypeId: r.issueTypeId?.toString?.(), name: r.name, count: r.count })),
    issuesByAgent: byAgent.map((r) => ({ agentId: r.agentId?.toString?.(), fullName: r.fullName, count: r.count })),
    issuesByTeam: byTeam.map((r) => ({ teamId: r.teamId?.toString?.(), name: r.name, count: r.count })),
    issuesByArea: byArea,
  });
});
