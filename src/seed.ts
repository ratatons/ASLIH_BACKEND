import { Permission } from "./models/Permission";
import { Role } from "./models/Role";
import { User } from "./models/User";
import { TicketType } from "./models/TicketType";
import { Team } from "./models/Team";
import { PERMISSION_SEED, DEFAULT_PUBLIC_ROLE_NAME, SUPER_ADMIN_ROLE_NAME } from "./constants/permissions";
import { hashPassword } from "./utils/password";
import { logger } from "./config/logger";

/**
 * Idempotent startup seed:
 * - Ensures every permission in PERMISSION_SEED exists.
 * - Ensures a SUPER_ADMIN system role exists with all permissions.
 * - Ensures the default public/agent role exists with a safe permission set.
 * - Creates a bootstrap super-admin account if SEED_SUPER_ADMIN_EMAIL /
 *   SEED_SUPER_ADMIN_PASSWORD are provided and no such user exists yet.
 * - Ensures a couple of starter ticket types and a default team exist so the
 *   app is usable immediately after first deploy (skipped if any already exist).
 *
 * Safe to run on every boot; only ever creates missing data, never overwrites
 * existing roles/permissions/users.
 */
export async function runSeed(): Promise<void> {
  // Permissions
  const permissionDocs = await Promise.all(
    PERMISSION_SEED.map((p) =>
      Permission.findOneAndUpdate({ key: p.key }, { $setOnInsert: p }, { new: true, upsert: true })
    )
  );

  // SUPER_ADMIN role: all permissions, system-protected
  let superAdminRole = await Role.findOne({ name: SUPER_ADMIN_ROLE_NAME });
  if (!superAdminRole) {
    superAdminRole = await Role.create({
      name: SUPER_ADMIN_ROLE_NAME,
      description: "Full access to all ASLIH modules.",
      isSystem: true,
      isEnabled: true,
      permissions: permissionDocs.map((p) => p!._id),
    });
    logger.info("Seeded SUPER_ADMIN role");
  } else {
    // Keep it in sync with newly added permission keys over time.
    const existingIds = new Set(superAdminRole.permissions.map((id) => id.toString()));
    const allIds = permissionDocs.map((p) => p!._id.toString());
    if (allIds.some((id) => !existingIds.has(id))) {
      superAdminRole.permissions = permissionDocs.map((p) => p!._id) as any;
      await superAdminRole.save();
    }
  }

  // Default public/agent role: safe, non-privileged. Agents can view ticket
  // types, report/view/update their own tickets, and view notifications.
  const agentPermissionKeys = ["TICKETS_VIEW", "TICKETS_CREATE", "TICKETS_UPDATE", "TICKETS_CHANGE_STATUS", "NOTIFICATIONS_VIEW"];
  let agentRole = await Role.findOne({ name: DEFAULT_PUBLIC_ROLE_NAME });
  if (!agentRole) {
    const agentPermissions = await Permission.find({ key: { $in: agentPermissionKeys } });
    agentRole = await Role.create({
      name: DEFAULT_PUBLIC_ROLE_NAME,
      description: "Default role for public self-registered field agents.",
      isSystem: true,
      isEnabled: true,
      permissions: agentPermissions.map((p) => p._id),
    });
    logger.info("Seeded default AGENT role");
  }

  // Bootstrap super-admin account (optional, controlled by env)
  const bootstrapEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  const bootstrapPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword) {
    const existing = await User.findOne({ email: bootstrapEmail.toLowerCase() });
    if (!existing) {
      const passwordHash = await hashPassword(bootstrapPassword);
      await User.create({
        fullName: process.env.SEED_SUPER_ADMIN_NAME || "ASLIH Super Admin",
        email: bootstrapEmail.toLowerCase(),
        phone: process.env.SEED_SUPER_ADMIN_PHONE || "+213000000000",
        passwordHash,
        isActive: true,
        roles: [superAdminRole._id],
      });
      logger.info({ email: bootstrapEmail }, "Seeded bootstrap super-admin account");
    }
  }

  // Starter ticket types (only if none exist yet, so admins remain free to
  // delete/replace them without the seed re-creating them every boot).
  const ticketTypeCount = await TicketType.countDocuments();
  if (ticketTypeCount === 0) {
    await TicketType.insertMany([
      { name: "Pothole", description: "Road surface damage", icon: "pothole", isActive: true },
      { name: "Broken Streetlight", description: "Non-functioning street lighting", icon: "lightbulb", isActive: true },
      { name: "Water Leak", description: "Public water infrastructure leak", icon: "droplet", isActive: true },
      { name: "Fallen Tree / Branch", description: "Obstruction from fallen vegetation", icon: "tree", isActive: true },
    ]);
    logger.info("Seeded starter ticket types");
  }

  const teamCount = await Team.countDocuments();
  if (teamCount === 0) {
    await Team.insertMany([
      { name: "Roads Maintenance", description: "Handles road and pothole tickets" },
      { name: "Electrical", description: "Handles lighting and electrical tickets" },
    ]);
    logger.info("Seeded starter teams");
  }
}
