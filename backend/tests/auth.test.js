const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");

const BASE = "http://localhost:5000/api/v1";

describe("Auth endpoints", () => {
  it("POST /auth/register with valid data returns 201", async () => {
    const body = JSON.stringify({ username: "testuser_" + Date.now(), password: "testpass123" });
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token || data.accessToken);
  });

  it("POST /auth/register with short username/password returns 400", async () => {
    const body = JSON.stringify({ username: "ab", password: "short" });
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.strictEqual(res.status, 400);
  });

  it("POST /auth/login with wrong password returns 401", async () => {
    const body = JSON.stringify({ username: "nonexistent", password: "wrongpass" });
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.strictEqual(res.status, 401);
  });
});
