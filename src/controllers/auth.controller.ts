import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { RefreshToken } from "../models/RefreshToken";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { serialize } from "../utils/serialize";
import { writeAuditLog } from "../utils/audit";
import { DEFAULT_PUBLIC_ROLE_NAME } from "../constants/permissions";
import { env } from "../config/env";
import ms from "../utils/ms";

async function issueTokenPair(userId: string) {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_TTL));
  await RefreshToken.create({ userId, jti, expiresAt });

  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);
  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  // NOTE: role/permissions/isAdmin/isSuperAdmin are intentionally never read
  // from the request body. Public registration always gets the safe default
  // role below; privileged accounts are only created via the authenticated
  // /api/users and /api/roles endpoints.
  const { fullName, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists.");
  }

  const defaultRole = await Role.findOne({ name: DEFAULT_PUBLIC_ROLE_NAME });
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    fullName,
    email,
    phone,
    passwordHash,
    isActive: true,
    roles: defaultRole ? [defaultRole._id] : [],
  });

  const { accessToken, refreshToken } = await issueTokenPair(user._id.toString());

  await writeAuditLog({
    actorUserId: user._id.toString(),
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: user._id.toString(),
    metadata: { email: user.email },
  });

  res.status(201).json({
    token: accessToken,
    refreshToken,
    user: serialize({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    }),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !user.isActive) {
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw ApiError.unauthenticated("Invalid email or password.");
  }

  const { accessToken, refreshToken } = await issueTokenPair(user._id.toString());

  await writeAuditLog({
    actorUserId: user._id.toString(),
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user._id.toString(),
    metadata: {},
  });

  res.json({
    token: accessToken,
    refreshToken,
    user: serialize({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    }),
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthenticated("Invalid or expired refresh token.");
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti, userId: payload.sub });
  if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthenticated("Refresh token is no longer valid.");
  }

  // Rotate: revoke the old token, issue a new pair.
  stored.revoked = true;
  await stored.save();

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(payload.sub);

  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await RefreshToken.updateOne({ jti: payload.jti }, { revoked: true });
    } catch {
      // Token already invalid/expired - logout is a no-op in that case.
    }
  }
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!;
  const user = await User.findById(auth.userId);
  if (!user) throw ApiError.notFound("User not found.");

  res.json({
    user: serialize({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }),
    roles: auth.roleNames,
    permissions: auth.permissions,
  });
});
