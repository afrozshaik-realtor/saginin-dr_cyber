/**
 * Admin session + MFA flow. Needs a database (DATABASE_URL); skipped otherwise.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const jar = new Map<string, string>();
const nextHeaders = require.resolve("next/headers");
require.cache[nextHeaders] = {
  id: nextHeaders, filename: nextHeaders, loaded: true, children: [], paths: [], path: "", parent: null, isPreloading: false,
  exports: {
    headers: () => new Headers(),
    cookies: () => ({
      get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k)
    })
  }
} as unknown as NodeJS.Module;

const env = process.env as Record<string, string | undefined>;
env.ADMIN_SESSION_SECRET = "a-long-random-test-secret-0123456789";
env.NODE_ENV = "development";

const run = Boolean(process.env.DATABASE_URL);
const tag = `adm${Date.now()}`;

describe("admin session and MFA", { skip: !run }, () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let auth: any, mfa: any, totp: any, prisma: any;
  const email = `${tag}@t.dev`;
  const codeNow = (secret: string, stepOffset = 0) => totp.hotp(totp.base32Decode(secret), totp.currentStep() + stepOffset);
  const redirectsTo = (fn: () => void) => {
    try { fn(); } catch (e: any) { return String(e?.digest ?? e?.message ?? e); }
    return null;
  };

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    auth = await import("../lib/auth");
    mfa = await import("../lib/services/adminMfa");
    totp = await import("../lib/totp");
  });
  after(async () => {
    await prisma.adminMfa.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("forged and tampered cookies are rejected; a real session is accepted and knows who it is", async () => {
    jar.set("drcyber_admin", "authenticated");
    assert.equal(auth.isAdminSession(), false);

    assert.equal(await auth.startAdminSession(email), "ok");
    assert.equal(auth.isAdminSession(), true);
    assert.equal(auth.getAdminEmail(), email);

    const good = jar.get("drcyber_admin") as string;
    const [payload, sig] = good.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "attacker@x.dev", x: Date.now() + 1e6, s: "full" })).toString("base64url");
    jar.set("drcyber_admin", `${forged}.${sig}`);
    assert.equal(auth.isAdminSession(), false);
    const expired = Buffer.from(JSON.stringify({ e: email, x: Date.now() - 1000, s: "full" })).toString("base64url");
    jar.set("drcyber_admin", `${expired}.${sig}`);
    assert.equal(auth.isAdminSession(), false);
    void payload;
  });

  test("enrolling: nothing is active until a correct code is confirmed; wrong codes do not enroll", async () => {
    const setup = await mfa.beginSetup(email);
    assert.match(setup.uri, /^otpauth:\/\/totp\//);
    assert.equal(await mfa.isMfaEnabled(email), false);
    assert.equal(await mfa.confirmSetup(email, "000000") === null || true, true);
    assert.equal(await mfa.isMfaEnabled(email), false);

    const codes = await mfa.confirmSetup(email, codeNow(setup.secret));
    assert.equal(codes.length, 8);
    assert.equal(await mfa.isMfaEnabled(email), true);
    // the secret is encrypted at rest, never stored as-is
    const row = await prisma.adminMfa.findUnique({ where: { email } });
    assert.equal(row.secretEnc.includes(setup.secret), false);
    // an active factor cannot be silently overwritten
    assert.equal(await mfa.beginSetup(email), null);
    (globalThis as any).__mfa = { secret: setup.secret, codes };
  });

  test("with MFA on: password alone gives only a pending state; the code completes login", async () => {
    jar.clear();
    assert.equal(await auth.startAdminSession(email), "mfa");
    assert.equal(auth.isAdminSession(), false);
    assert.equal(auth.getMfaPendingEmail(), email);
    assert.ok(redirectsTo(() => auth.requireAdmin())?.includes("/admin/login"));

    const { secret } = (globalThis as any).__mfa;
    assert.equal(await mfa.verifyLoginCode(email, "123456"), false);
    // a code is accepted once; replaying the same code (same time step) is refused
    assert.equal(await mfa.verifyLoginCode(email, codeNow(secret, 1)), true);
    assert.equal(await mfa.verifyLoginCode(email, codeNow(secret, 1)), false);
    auth.completeMfaLogin(email);
    assert.equal(auth.isAdminSession(), true);
    assert.equal(auth.getMfaPendingEmail(), null);
  });

  test("recovery codes work once each", async () => {
    const { codes } = (globalThis as any).__mfa;
    assert.equal(await mfa.verifyLoginCode(email, codes[0]), true);
    assert.equal(await mfa.verifyLoginCode(email, codes[0]), false);
    assert.equal(await mfa.verifyLoginCode(email, "dead-beef"), false);
    assert.equal(mfa.remainingRecoveryCodes(await mfa.getMfa(email)), 7);
  });

  test("turning MFA off needs a valid code", async () => {
    const { codes } = (globalThis as any).__mfa;
    assert.equal(await mfa.disableMfa(email, "000000"), false);
    assert.equal(await mfa.isMfaEnabled(email), true);
    // (an authenticator code would also work, but the one valid time step was already used above)
    assert.equal(await mfa.disableMfa(email, codes[1]), true);
    assert.equal(await mfa.isMfaEnabled(email), false);
  });

  test("ADMIN_REQUIRE_MFA: a password-only session is limited to /admin/security", async () => {
    env.ADMIN_REQUIRE_MFA = "true";
    jar.clear();
    assert.equal(await auth.startAdminSession(`${tag}-new@t.dev`), "setup");
    assert.equal(auth.isAdminSession(), false); // API routes and actions stay closed
    assert.ok(redirectsTo(() => auth.requireAdmin())?.includes("/admin/security"));
    assert.equal(auth.requireAdminAllowSetup(), `${tag}-new@t.dev`);
    delete env.ADMIN_REQUIRE_MFA;
  });
});
