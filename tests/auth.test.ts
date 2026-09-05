import request from "supertest";
import { createApp } from "../src/app";
import { runSeed } from "../src/seed";

const app = createApp();

describe("Auth", () => {
  beforeEach(async () => {
    await runSeed();
  });

  it("registers a new agent with a safe default role and rejects client-supplied role/isAdmin fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Agent Test",
        email: "agent@example.com",
        phone: "+213555000111",
        password: "supersecurepw",
        role: "SUPER_ADMIN", // must be ignored
        isAdmin: true, // must be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("agent@example.com");
    expect(res.body.user._id).toBeUndefined();
    expect(res.body.user.id).toBeDefined();
    expect(res.body.token).toBeDefined();

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.roles).toContain("AGENT");
    expect(me.body.permissions).not.toContain("USERS_DELETE");
  });

  it("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      fullName: "Agent Two",
      email: "agent2@example.com",
      phone: "+213555000222",
      password: "supersecurepw",
    });

    const res = await request(app).post("/api/auth/login").send({ email: "agent2@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("requires auth for protected routes", async () => {
    const res = await request(app).get("/api/issues");
    expect(res.status).toBe(401);
  });
});
