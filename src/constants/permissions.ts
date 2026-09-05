// Canonical seed list of permission keys. This is only used to seed the
// database on first boot — the source of truth at runtime is the
// `permissions` collection, and clients must fetch GET /api/permissions
// and GET /api/roles rather than hardcoding this list.
export const PERMISSION_SEED: Array<{ key: string; label: string; module: string; action: string }> = [
  { key: "TICKETS_VIEW", label: "View tickets", module: "TICKETS", action: "VIEW" },
  { key: "TICKETS_CREATE", label: "Create tickets", module: "TICKETS", action: "CREATE" },
  { key: "TICKETS_ASSIGN", label: "Assign tickets", module: "TICKETS", action: "ASSIGN" },
  { key: "TICKETS_UPDATE", label: "Update tickets", module: "TICKETS", action: "UPDATE" },
  { key: "TICKETS_DELETE", label: "Delete tickets", module: "TICKETS", action: "DELETE" },
  { key: "TICKETS_CHANGE_STATUS", label: "Change ticket status", module: "TICKETS", action: "CHANGE_STATUS" },

  { key: "MAP_VIEW", label: "View map", module: "MAP", action: "VIEW" },

  { key: "USERS_VIEW", label: "View users", module: "USERS", action: "VIEW" },
  { key: "USERS_CREATE", label: "Create users", module: "USERS", action: "CREATE" },
  { key: "USERS_UPDATE", label: "Update users", module: "USERS", action: "UPDATE" },
  { key: "USERS_DELETE", label: "Delete users", module: "USERS", action: "DELETE" },
  { key: "USERS_ASSIGN_ROLE", label: "Assign user roles", module: "USERS", action: "ASSIGN_ROLE" },

  { key: "AGENTS_VIEW", label: "View agents", module: "AGENTS", action: "VIEW" },
  { key: "AGENTS_CREATE", label: "Create agents", module: "AGENTS", action: "CREATE" },
  { key: "AGENTS_UPDATE", label: "Update agents", module: "AGENTS", action: "UPDATE" },
  { key: "AGENTS_DELETE", label: "Delete agents", module: "AGENTS", action: "DELETE" },

  { key: "TEAMS_VIEW", label: "View teams", module: "TEAMS", action: "VIEW" },
  { key: "TEAMS_CREATE", label: "Create teams", module: "TEAMS", action: "CREATE" },
  { key: "TEAMS_UPDATE", label: "Update teams", module: "TEAMS", action: "UPDATE" },
  { key: "TEAMS_DELETE", label: "Delete teams", module: "TEAMS", action: "DELETE" },

  { key: "ROLES_VIEW", label: "View roles", module: "ROLES", action: "VIEW" },
  { key: "ROLES_CREATE", label: "Create roles", module: "ROLES", action: "CREATE" },
  { key: "ROLES_UPDATE", label: "Update roles", module: "ROLES", action: "UPDATE" },
  { key: "ROLES_DELETE", label: "Delete roles", module: "ROLES", action: "DELETE" },

  { key: "TICKET_TYPES_VIEW", label: "View ticket types", module: "TICKET_TYPES", action: "VIEW" },
  { key: "TICKET_TYPES_CREATE", label: "Create ticket types", module: "TICKET_TYPES", action: "CREATE" },
  { key: "TICKET_TYPES_UPDATE", label: "Update ticket types", module: "TICKET_TYPES", action: "UPDATE" },
  { key: "TICKET_TYPES_DELETE", label: "Delete ticket types", module: "TICKET_TYPES", action: "DELETE" },
  { key: "TICKET_TYPES_ASSIGN_USERS", label: "Assign eligible users", module: "TICKET_TYPES", action: "ASSIGN_USERS" },
  { key: "TICKET_TYPES_ASSIGN_TEAMS", label: "Assign eligible teams", module: "TICKET_TYPES", action: "ASSIGN_TEAMS" },

  { key: "ANALYTICS_VIEW", label: "View analytics", module: "ANALYTICS", action: "VIEW" },
  { key: "AUDIT_LOGS_VIEW", label: "View audit logs", module: "AUDIT_LOGS", action: "VIEW" },
  { key: "NOTIFICATIONS_VIEW", label: "View notifications", module: "NOTIFICATIONS", action: "VIEW" },
];

// Default, safe, non-privileged role assigned to every public self-registration.
export const DEFAULT_PUBLIC_ROLE_NAME = "AGENT";

// Full-access system role created on first boot so the deployment has an
// initial administrator. Additional admins should be created/promoted
// through the authenticated Users/Roles endpoints afterwards.
export const SUPER_ADMIN_ROLE_NAME = "SUPER_ADMIN";
