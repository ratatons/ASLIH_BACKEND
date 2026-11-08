import request from "supertest";
import { createApp } from "../src/app";
import { runSeed } from "../src/seed";
import { User } from "../src/models/User";

const app = createApp();

describe("Auth", () => {
  beforeEach(async () => {
    await runSeed();
  });

  it("registers a pending account (no token), ignores role/isAdmin, and works after an admin activates it", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Agent Test",
        email: "agent@example.com",
        phone: "+213555000111",
        password: "supersecurepw",
        role: "SUPER_ADMIN", // must be ignored
        isAdmin: true, // must be ignored
        isActive: true, // must be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.pending).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(res.body.user.email).toBe("agent@example.com");
    expect(res.body.user._id).toBeUndefined();
    expect(res.body.user.id).toBeDefined();

    const stored = await User.findById(res.body.user.id);
    expect(stored!.isActive).toBe(false);

    // Pending account cannot sign in
    const blocked = await request(app).post("/api/auth/login").send({ email: "agent@example.com", password: "supersecurepw" });
    expect(blocked.status).toBe(401);

    // Admin activates it (simulated directly in the DB)
    await User.findByIdAndUpdate(res.body.user.id, { isActive: true });

    const login = await request(app).post("/api/auth/login").send({ email: "agent@example.com", password: "supersecurepw" });
    expect(login.status).toBe(200);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.roles).toContain("AGENT");
    expect(me.body.permissions).not.toContain("USERS_DELETE");
  });

  it("rejects login with wrong password", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      fullName: "Agent Two",
      email: "agent2@example.com",
      phone: "+213555000222",
      password: "supersecurepw",
    });
    await User.findByIdAndUpdate(reg.body.user.id, { isActive: true });

    const res = await request(app).post("/api/auth/login").send({ email: "agent2@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("requires auth for protected routes", async () => {
    const res = await request(app).get("/api/issues");
    expect(res.status).toBe(401);
  });
});
