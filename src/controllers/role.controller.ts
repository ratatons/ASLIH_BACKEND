import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { Role } from "../models/Role";
import { Permission } from "../models/Permission";
import { User } from "../models/User";

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await Permission.find().sort({ module: 1, action: 1 });
  res.json({ items: serialize(permissions) });
});

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await Role.find().populate("permissions").sort({ name: 1 });
  res.json({ items: serialize(roles) });
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id).populate("permissions");
  if (!role) throw ApiError.notFound("Role not found.");
  res.json(serialize(role));
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, isEnabled, permissionIds } = req.body;

  let permissions: string[] = [];
  if (permissionIds?.length) {
    const found = await Permission.find({ _id: { $in: permissionIds } });
    permissions = found.map((p) => p._id.toString());
  }

  const role = await Role.create({ name, description, isEnabled: isEnabled ?? true, permissions, isSystem: false });

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ROLE_CREATED",
    entityType: "Role",
    entityId: role._id.toString(),
    metadata: { name },
  });

  res.status(201).json(serialize(role));
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound("Role not found.");
  if (role.isSystem && req.body.name) {
    throw ApiError.forbidden("System roles cannot be renamed.");
  }

  Object.assign(role, req.body);
  await role.save();

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ROLE_UPDATED",
    entityType: "Role",
    entityId: role._id.toString(),
    metadata: req.body,
  });

  res.json(serialize(role));
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound("Role not found.");
  if (role.isSystem) throw ApiError.forbidden("System roles cannot be deleted.");

  const inUse = await User.exists({ roles: role._id });
  if (inUse) throw ApiError.conflict("This role is still assigned to one or more users.");

  await role.deleteOne();

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ROLE_DELETED",
    entityType: "Role",
    entityId: role._id.toString(),
    metadata: { name: role.name },
  });

  res.status(204).send();
});

export const addRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionIds } = req.body;

  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound("Role not found.");

  const found = await Permission.find({ _id: { $in: permissionIds } });
  if (found.length !== permissionIds.length) {
    throw ApiError.badRequest("One or more permission ids are invalid.");
  }

  const existing = new Set(role.permissions.map((p) => p.toString()));
  for (const id of permissionIds) existing.add(id);
  role.permissions = Array.from(existing) as any;
  await role.save();

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ROLE_PERMISSIONS_UPDATED",
    entityType: "Role",
    entityId: role._id.toString(),
    metadata: { added: permissionIds },
  });

  res.json(serialize(await role.populate("permissions")));
});

export const removeRolePermission = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw ApiError.notFound("Role not found.");

  role.permissions = role.permissions.filter((p) => p.toString() !== req.params.permissionId) as any;
  await role.save();

  await writeAuditLog({
    actorUserId: req.auth!.userId,
    action: "ROLE_PERMISSIONS_UPDATED",
    entityType: "Role",
    entityId: role._id.toString(),
    metadata: { removed: req.params.permissionId },
  });

  res.json(serialize(await role.populate("permissions")));
});
