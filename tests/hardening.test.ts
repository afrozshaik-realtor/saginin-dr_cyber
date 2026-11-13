import assert from "node:assert/strict";
import { test } from "node:test";

const jar = new Map<string, string>();
const nextHeaders = require.resolve("next/headers");
require.cache[nextHeaders] = {
  id: nextHeaders, filename: nextHeaders, loaded: true, children: [], paths: [], path: "", parent: null, isPreloading: false,
  exports: {
    cookies: () => ({
      get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k)
    })
  }
} as unknown as NodeJS.Module;

const env = process.env as Record<string, string | undefined>;

test("production without a session secret never uses the public default: a cookie forged with it is rejected", () => {
  env.NODE_ENV = "production";
  delete env.STUDENT_SESSION_SECRET;
  delete env.ADMIN_SESSION_SECRET;
  const { createHmac } = require("node:crypto");
  const forged = `victim-id.${createHmac("sha256", "dev-secret-change-me").update("victim-id").digest("hex")}`;
  jar.set("drcyber_student", forged);
  const { getStudentSessionId } = require("../lib/studentAuth");
  assert.equal(getStudentSessionId(), null);
});

test("placeholder secrets from .env.example count as unset in production", () => {
  env.NODE_ENV = "production";
  env.STUDENT_SESSION_SECRET = "replace-with-a-different-long-random-secret";
  const { createHmac } = require("node:crypto");
  const forged = `victim-id.${createHmac("sha256", "replace-with-a-different-long-random-secret").update("victim-id").digest("hex")}`;
  jar.set("drcyber_student", forged);
  const { getStudentSessionId } = require("../lib/studentAuth");
  assert.equal(getStudentSessionId(), null);
});

test("a real secret still works", () => {
  env.NODE_ENV = "production";
  env.STUDENT_SESSION_SECRET = "a-proper-long-random-secret-0123456789abcdef";
  const { setStudentSession, getStudentSessionId } = require("../lib/studentAuth");
  setStudentSession("student-123");
  assert.equal(getStudentSessionId(), "student-123");
});

test("admin registration is closed in production unless explicitly allowed", () => {
  const { adminRegistrationAllowed } = require("../lib/auth");
  env.NODE_ENV = "production";
  delete env.ALLOW_ADMIN_REGISTER;
  assert.equal(adminRegistrationAllowed(), false);
  env.ALLOW_ADMIN_REGISTER = "true";
  assert.equal(adminRegistrationAllowed(), true);
  env.NODE_ENV = "development";
  delete env.ALLOW_ADMIN_REGISTER;
  assert.equal(adminRegistrationAllowed(), true);
});

test("production: the public default admin login (admin@example.com / ChangeMe123!) does not work", async () => {
  env.NODE_ENV = "production";
  delete env.ADMIN_EMAIL; delete env.ADMIN_PASSWORD; delete env.ADMIN_PASSWORD_HASH;
  const { verifyAdmin } = require("../lib/auth");
  // With no env admin configured in production the lookup falls through to the DB-backed admin_users only;
  // stub it out so this stays a pure unit test.
  const storePath = require.resolve("../lib/store");
  require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, children: [], paths: [], path: "", parent: null, isPreloading: false, exports: { getAdminUserByEmail: async () => null } } as unknown as NodeJS.Module;
  delete require.cache[require.resolve("../lib/auth")];
  const fresh = require("../lib/auth");
  assert.equal(await fresh.verifyAdmin("admin@example.com", "ChangeMe123!"), false);

  env.ADMIN_EMAIL = "owner@drcyber.ca";
  env.ADMIN_PASSWORD = "a-strong-unique-password-9876";
  assert.equal(await fresh.verifyAdmin("owner@drcyber.ca", "a-strong-unique-password-9876"), true);
  assert.equal(await fresh.verifyAdmin("owner@drcyber.ca", "wrong"), false);

  env.ADMIN_EMAIL = "admin@example.com";
  env.ADMIN_PASSWORD = "ChangeMe123!";
  assert.equal(await fresh.verifyAdmin("admin@example.com", "ChangeMe123!"), false); // even if someone sets the defaults explicitly
  void verifyAdmin;
});
