const test = require("node:test");
const assert = require("node:assert/strict");
const { sendSuccess, sendError } = require("../../utils/responseFormatter");

const createResponse = () => {
  const response = {
    statusCode: null,
    body: null,
    req: { traceId: "trace-test" },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    get() {
      return undefined;
    },
  };

  return response;
};

test("sendSuccess returns envelope and compatibility payload", () => {
  const res = createResponse();
  sendSuccess(res, { user: { id: "1" }, token: "abc" }, 201, "created");

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "created");
  assert.equal(res.body.traceId, "trace-test");
  assert.equal(res.body.token, "abc");
  assert.deepEqual(res.body.data.user, { id: "1" });
});

test("sendError returns consistent error envelope", () => {
  const res = createResponse();
  sendError(res, "Nope", 403, "FORBIDDEN", { reason: "role" });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, "FORBIDDEN");
  assert.equal(res.body.error.details.reason, "role");
});
