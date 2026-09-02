import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";
import { resetIntrasiteForTests } from "../src/intrasite/store.js";

const admin = {
  email: "admin@carescope.local",
  password: "password",
};

describe("Intrasite auth and multi-tenancy", () => {
  beforeEach(async () => {
    process.env["INTRASITE_JWT_SECRET"] = "test-secret";
    process.env["INTRASITE_ADMIN_EMAIL"] = admin.email;
    process.env["INTRASITE_ADMIN_PASSWORD"] = admin.password;
    await resetIntrasiteForTests();
  });

  it("rejects invalid credentials", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/intrasite/auth/login").send({
      email: admin.email,
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("logs in and returns the current user", async () => {
    const app = createApp();
    const login = await request(app).post("/api/v1/intrasite/auth/login").send(admin);
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe(admin.email);
    expect(login.body.token).toBeTruthy();

    const me = await request(app)
      .get("/api/v1/intrasite/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("platform_admin");
  });

  it("blocks unauthenticated client listing", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/intrasite/clients");
    expect(res.status).toBe(401);
  });

  it("creates isolated client databases and labs", async () => {
    const app = createApp();
    const login = await request(app).post("/api/v1/intrasite/auth/login").send(admin);
    const token = login.body.token as string;
    const auth = { Authorization: `Bearer ${token}` };

    const apex = await request(app)
      .post("/api/v1/intrasite/clients")
      .set(auth)
      .send({ name: "Apex Diagnostics", slug: "apex-diagnostics" });
    expect(apex.status).toBe(201);
    expect(apex.body.client.databaseName).toBe("cs_apex_diagnostics");
    expect(apex.body.client.isolation).toBe("dedicated_database");
    expect(apex.body.routing.tenantValue).toBe("apex-diagnostics");

    const harbor = await request(app)
      .post("/api/v1/intrasite/clients")
      .set(auth)
      .send({ name: "Harbor Clinical", slug: "harbor-clinical" });
    expect(harbor.status).toBe(201);

    const north = await request(app)
      .post(`/api/v1/intrasite/clients/${apex.body.client.id}/labs`)
      .set(auth)
      .send({ name: "North Lab", slug: "north-lab" });
    expect(north.status).toBe(201);

    const apexLabs = await request(app)
      .get(`/api/v1/intrasite/clients/${apex.body.client.id}/labs`)
      .set(auth);
    const harborLabs = await request(app)
      .get(`/api/v1/intrasite/clients/${harbor.body.client.id}/labs`)
      .set(auth);

    expect(apexLabs.body.labs).toHaveLength(1);
    expect(apexLabs.body.labs[0].name).toBe("North Lab");
    expect(harborLabs.body.labs).toHaveLength(0);
  });

  it("sets an httpOnly session cookie on login", async () => {
    const app = createApp();
    const login = await request(app).post("/api/v1/intrasite/auth/login").send(admin);
    const cookie = login.headers["set-cookie"];
    expect(String(cookie)).toMatch(/intrasite_token=/);
    expect(String(cookie).toLowerCase()).toMatch(/httponly/);
  });
});
