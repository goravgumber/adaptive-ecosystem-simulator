const test = require("node:test");
const assert = require("node:assert/strict");
const requireRole = require("../../middleware/requireRole");

test("requireRole allows users with an accepted role", async () => {
  const middleware = requireRole("admin");
  const req = { user: { role: "admin" } };

  await new Promise((resolve, reject) => {
    middleware(req, {}, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

test("requireRole rejects users without an accepted role", () => {
  const middleware = requireRole("admin");
  const req = { user: { role: "user" } };

  middleware(req, {}, (err) => {
    assert.equal(err.statusCode, 403);
    assert.equal(err.message, "Insufficient permissions");
  });
});
