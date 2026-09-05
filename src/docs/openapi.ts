// Minimal hand-written OpenAPI 3.0 document describing the public surface of
// the API. Served at GET /api/docs (Swagger UI) and GET /api/docs.json.
// Extend this as new routes are added.
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ASLIH Backend API",
    version: "1.0.0",
    description:
      "Central backend for ASLIH AGENT (mobile) and ASLIH ADMIN (web). MongoDB-backed, JWT-authenticated REST API with Socket.IO real-time events.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register a new account (email + password + mandatory phone)",
        security: [],
        responses: { "201": { description: "Created" }, "409": { description: "Email already exists" } },
      },
    },
    "/auth/login": {
      post: { summary: "Log in", security: [], responses: { "200": { description: "OK" } } },
    },
    "/auth/refresh": {
      post: { summary: "Rotate refresh token", security: [], responses: { "200": { description: "OK" } } },
    },
    "/auth/logout": {
      post: { summary: "Revoke refresh token", security: [], responses: { "204": { description: "No content" } } },
    },
    "/auth/me": {
      get: { summary: "Current user, roles, permissions", responses: { "200": { description: "OK" } } },
    },
    "/issue-types": {
      get: { summary: "List ticket types (active by default)", responses: { "200": { description: "OK" } } },
      post: { summary: "Create ticket type (TICKET_TYPES_CREATE)", responses: { "201": { description: "Created" } } },
    },
    "/issue-types/{id}": {
      get: { summary: "Get ticket type", responses: { "200": { description: "OK" } } },
      patch: { summary: "Update ticket type (TICKET_TYPES_UPDATE)", responses: { "200": { description: "OK" } } },
      delete: { summary: "Delete ticket type (TICKET_TYPES_DELETE)", responses: { "204": { description: "No content" } } },
    },
    "/issue-types/{id}/eligible-users": {
      get: { summary: "List eligible users for ticket type", responses: { "200": { description: "OK" } } },
      put: { summary: "Set eligible users (TICKET_TYPES_ASSIGN_USERS)", responses: { "200": { description: "OK" } } },
    },
    "/issue-types/{id}/eligible-teams": {
      get: { summary: "List eligible teams for ticket type", responses: { "200": { description: "OK" } } },
      put: { summary: "Set eligible teams (TICKET_TYPES_ASSIGN_TEAMS)", responses: { "200": { description: "OK" } } },
    },
    "/issues": {
      post: { summary: "Report a new issue (Agent A) - TICKETS_CREATE", responses: { "201": { description: "Created" } } },
      get: { summary: "List issues with filters/pagination - TICKETS_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}/photos": {
      post: { summary: "Upload REPORT or COMPLETION photo (multipart/form-data, field 'photo')", responses: { "201": { description: "Created" } } },
    },
    "/issues/map": {
      get: { summary: "Map-safe ticket listing - MAP_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}": {
      get: { summary: "Ticket detail incl. photos + status history - TICKETS_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}/history": {
      get: { summary: "Status history for a ticket", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}/assign": {
      patch: { summary: "Assign ticket to agent+team - TICKETS_ASSIGN", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}/start-maintenance": {
      post: { summary: "Agent starts maintenance (GPS proximity enforced)", responses: { "200": { description: "OK" } } },
    },
    "/issues/{id}/complete": {
      post: { summary: "Agent completes ticket (completion photo required)", responses: { "200": { description: "OK" } } },
    },
    "/agent/issues": {
      get: { summary: "Tickets assigned to the authenticated agent", responses: { "200": { description: "OK" } } },
    },
    "/agent/issues/{id}": {
      get: { summary: "Agent ticket detail (assignment verified server-side)", responses: { "200": { description: "OK" } } },
    },
    "/agents": {
      get: { summary: "List agent profiles - AGENTS_VIEW", responses: { "200": { description: "OK" } } },
      post: { summary: "Create agent profile - AGENTS_CREATE", responses: { "201": { description: "Created" } } },
    },
    "/teams": {
      get: { summary: "List teams - TEAMS_VIEW", responses: { "200": { description: "OK" } } },
      post: { summary: "Create team - TEAMS_CREATE", responses: { "201": { description: "Created" } } },
    },
    "/users": {
      get: { summary: "List users - USERS_VIEW", responses: { "200": { description: "OK" } } },
      post: { summary: "Create user - USERS_CREATE", responses: { "201": { description: "Created" } } },
    },
    "/users/{id}/role": {
      patch: { summary: "Assign roles to user - USERS_ASSIGN_ROLE", responses: { "200": { description: "OK" } } },
    },
    "/roles": {
      get: { summary: "List roles - ROLES_VIEW", responses: { "200": { description: "OK" } } },
      post: { summary: "Create role - ROLES_CREATE", responses: { "201": { description: "Created" } } },
    },
    "/permissions": {
      get: { summary: "List all permission keys - ROLES_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/notifications": {
      get: { summary: "List authenticated user's notifications", responses: { "200": { description: "OK" } } },
    },
    "/audit-logs": {
      get: { summary: "List audit log entries - AUDIT_LOGS_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/analytics/dashboard": {
      get: { summary: "Ticket counts, resolution %, avg resolution time - ANALYTICS_VIEW", responses: { "200": { description: "OK" } } },
    },
    "/analytics/summary": {
      get: { summary: "Breakdowns by type/agent/team/area - ANALYTICS_VIEW", responses: { "200": { description: "OK" } } },
    },
  },
};
