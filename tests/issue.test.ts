import request from "supertest";
import { createApp } from "../src/app";
import { runSeed } from "../src/seed";
import { Role } from "../src/models/Role";
import { User } from "../src/models/User";
import { TicketType } from "../src/models/TicketType";

const app = createApp();

async function registerAndLogin(email: string, phone: string) {
  const res = await request(app).post("/api/auth/register").send({
    fullName: "Test User",
    email,
    phone,
    password: "supersecurepw",
  });
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

async function promoteToSuperAdmin(userId: string) {
  const role = await Role.findOne({ name: "SUPER_ADMIN" });
  await User.findByIdAndUpdate(userId, { roles: [role!._id] });
}

describe("Issue lifecycle (end-to-end style, minus file upload)", () => {
  beforeEach(async () => {
    await runSeed();
  });

  it("full flow: report -> assign -> start maintenance -> complete", async () => {
    const agentA = await registerAndLogin("agenta@example.com", "+213555000001");
    const agentB = await registerAndLogin("agentb@example.com", "+213555000002");
    const admin = await registerAndLogin("admin@example.com", "+213555000003");
    await promoteToSuperAdmin(admin.userId);

    // Admin creates an AgentProfile + Team for Agent B so it is assignable
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Roads" });
    expect(teamRes.status).toBe(201);

    const agentProfileRes = await request(app)
      .post("/api/agents")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: agentB.userId, teamId: teamRes.body.id, employeeNumber: "EMP-001" });
    expect(agentProfileRes.status).toBe(201);

    const issueType = await TicketType.findOne({ name: "Pothole" });

    // Agent A reports an issue
    const createRes = await request(app)
      .post("/api/issues")
      .set("Authorization", `Bearer ${agentA.token}`)
      .send({
        issueTypeId: issueType!._id.toString(),
        description: "Large pothole on main street",
        latitude: 36.7525,
        longitude: 3.042,
        locationAccuracy: 5,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("NEW");
    expect(createRes.body.ticketCode).toMatch(/^ASL-\d{6}$/);
    const issueId = createRes.body.id;

    // Reporter cannot self-assign implicitly - only permitted admin can assign
    const assignRes = await request(app)
      .patch(`/api/issues/${issueId}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ agentId: agentB.userId, teamId: teamRes.body.id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.status).toBe("ASSIGNED");

    // Agent B starts maintenance at (approximately) the ticket's location
    const startRes = await request(app)
      .post(`/api/issues/${issueId}/start-maintenance`)
      .set("Authorization", `Bearer ${agentB.token}`)
      .send({ latitude: 36.7525, longitude: 3.042, locationAccuracy: 4 });
    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe("ON_MAINTENANCE");

    // Completion requires a completion photo first
    const completeWithoutPhoto = await request(app)
      .post(`/api/issues/${issueId}/complete`)
      .set("Authorization", `Bearer ${agentB.token}`)
      .send({ latitude: 36.7525, longitude: 3.042 });
    expect(completeWithoutPhoto.status).toBe(400);

    const photoRes = await request(app)
      .post(`/api/issues/${issueId}/photos`)
      .set("Authorization", `Bearer ${agentB.token}`)
      .field("type", "COMPLETION")
      .attach("photo", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), "completion.jpg");
    expect(photoRes.status).toBe(201);

    const completeRes = await request(app)
      .post(`/api/issues/${issueId}/complete`)
      .set("Authorization", `Bearer ${agentB.token}`)
      .send({ latitude: 36.7525, longitude: 3.042, resolutionNote: "Filled and resurfaced." });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe("FIXED");
  });

  it("rejects starting maintenance far from the ticket location", async () => {
    const agentA = await registerAndLogin("agenta2@example.com", "+213555000004");
    const agentB = await registerAndLogin("agentb2@example.com", "+213555000005");
    const admin = await registerAndLogin("admin2@example.com", "+213555000006");
    await promoteToSuperAdmin(admin.userId);

    const teamRes = await request(app).post("/api/teams").set("Authorization", `Bearer ${admin.token}`).send({ name: "Roads2" });
    await request(app)
      .post("/api/agents")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ userId: agentB.userId, teamId: teamRes.body.id, employeeNumber: "EMP-002" });

    const issueType = await TicketType.findOne({ name: "Pothole" });
    const createRes = await request(app)
      .post("/api/issues")
      .set("Authorization", `Bearer ${agentA.token}`)
      .send({ issueTypeId: issueType!._id.toString(), description: "Pothole far away", latitude: 36.75, longitude: 3.04 });

    await request(app)
      .patch(`/api/issues/${createRes.body.id}/assign`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ agentId: agentB.userId, teamId: teamRes.body.id });

    // Agent B is 10km away - should be rejected
    const startRes = await request(app)
      .post(`/api/issues/${createRes.body.id}/start-maintenance`)
      .set("Authorization", `Bearer ${agentB.token}`)
      .send({ latitude: 36.85, longitude: 3.04 });
    expect(startRes.status).toBe(403);
  });
});
