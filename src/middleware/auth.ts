import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Permission } from "../models/Permission";

export interface AuthContext {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  roleIds: string[];
  roleNames: string[];
  permissions: string[]; // permission keys
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

async function loadAuthContext(userId: string): Promise<AuthContext> {
  const user = await User.findById(userId).populate({
    path: "roles",
    populate: { path: "permissions" },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthenticated("Account is not available.");
  }

  const roles = (user.roles as unknown as Array<{ _id: unknown; name: string; isEnabled: boolean; permissions: Array<{ key: string }> }>) || [];
  const enabledRoles = roles.filter((r) => r.isEnabled);
  const permissionSet = new Set<string>();
  for (const role of enabledRoles) {
    for (const perm of role.permissions || []) {
      permissionSet.add(perm.key);
    }
  }

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    roleIds: enabledRoles.map((r) => String(r._id)),
    roleNames: enabledRoles.map((r) => r.name),
    permissions: Array.from(permissionSet),
  };
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthenticated("Missing or invalid Authorization header.");
  }
  const token = header.slice("Bearer ".length).trim();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthenticated("Invalid or expired access token.");
  }

  if (payload.type !== "access") {
    throw ApiError.unauthenticated("Invalid token type.");
  }

  req.auth = await loadAuthContext(payload.sub);
  next();
});

export function requirePermission(...permissionKeys: string[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw ApiError.unauthenticated();
    }
    const has = permissionKeys.some((key) => req.auth!.permissions.includes(key));
    if (!has) {
      throw ApiError.forbidden();
    }
    next();
  });
}

export function requireAnyRole(...roleNames: string[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw ApiError.unauthenticated();
    }
    const has = roleNames.some((name) => req.auth!.roleNames.includes(name));
    if (!has) {
      throw ApiError.forbidden();
    }
    next();
  });
}

export { Role, Permission };
