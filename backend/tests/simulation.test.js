const { describe, it } = require("node:test");
const assert = require("node:assert");

const BASE = "http://localhost:5000/api/v1";

describe("Simulation endpoints", () => {
  it("GET /simulation/status without auth returns 401", async () => {
    const res = await fetch(`${BASE}/simulation/status`);
    assert.strictEqual(res.status, 401);
  });

  it("GET /simulation/status with valid token returns 200", async () => {
    // register a user first
    const username = "simtest_" + Date.now();
    const reg = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "testpass123" }),
    });
    const regData = await reg.json();
    const token = regData.token || regData.accessToken;

    const res = await fetch(`${BASE}/simulation/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.isRunning === "boolean");
  });

  it("POST /simulation with plants=0 returns 400", async () => {
    const username = "simtest2_" + Date.now();
    const reg = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "testpass123" }),
    });
    const regData = await reg.json();
    const token = regData.token || regData.accessToken;

    const res = await fetch(`${BASE}/simulation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plants: 0, herbivores: 0, carnivores: 0 }),
    });
    assert.strictEqual(res.status, 400);
  });
});
