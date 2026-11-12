import assert from "node:assert/strict";
import { test } from "node:test";

const jar = new Map<string, string>();
// Minimal stand-in for next/headers cookies() so lib/auth can be exercised outside Next.
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

process.env.ADMIN_SESSION_SECRET = "a-long-random-test-secret-0123456789";

test("forged and tampered admin cookies are rejected; a real session is accepted", () => {
  const { isAdminSession, setAdminSession } = require("../lib/auth");
  jar.set("drcyber_admin", "authenticated");
  assert.equal(isAdminSession(), false);

  setAdminSession();
  assert.equal(isAdminSession(), true);

  const good = jar.get("drcyber_admin") as string;
  const [expiry, sig] = good.split(".");
  jar.set("drcyber_admin", `${Number(expiry) + 1000}.${sig}`);
  assert.equal(isAdminSession(), false);

  jar.set("drcyber_admin", `${Date.now() - 1000}.${sig}`);
  assert.equal(isAdminSession(), false);
});
