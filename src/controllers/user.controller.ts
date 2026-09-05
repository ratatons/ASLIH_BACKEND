import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { hashPassword } from "../utils/password";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { emitBroadcast } from "../sockets";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, search, roleId, status } = req.query as any;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  if (roleId) filter.roles = roleId;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate("roles")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);

  res.json({ items: serialize(items), total, page, pageSize });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).populate("roles");
  if (!user) throw ApiError.notFound("User not found.");
  res.json(serialize(user));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone, password, roleIds, isActive } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("An account with this email already exists.");

  let roles: string[] = [];
  if (roleIds?.length) {
    const found = await Role.find({ _id: { $in: roleIds } });
    roles = found.map((r) => r._id.toString());
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ fullName, email, phone, passwordHash, roles, isActive: isActive ?? true });

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user._id.toString(),
    metadata: { email, roleIds: roles },
  });

  res.status(201).json(serialize(user));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound("User not found.");

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: user._id.toString(),
    metadata: req.body,
  });

  res.json(serialize(user));
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { roleIds } = req.body;

  const roles = await Role.find({ _id: { $in: roleIds } });
  if (roles.length !== roleIds.length) {
    throw ApiError.badRequest("One or more role ids are invalid.");
  }

  const user = await User.findByIdAndUpdate(req.params.id, { roles: roleIds }, { new: true }).populate("roles");
  if (!user) throw ApiError.notFound("User not found.");

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: user._id.toString(),
    metadata: { roleIds },
  });

  emitBroadcast("user.role_changed", { userId: user._id.toString(), roleIds });

  res.json(serialize(user));
});
