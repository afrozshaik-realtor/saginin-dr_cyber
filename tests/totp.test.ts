import assert from "node:assert/strict";
import { test } from "node:test";
import { base32Decode, base32Encode, decryptSecret, encryptSecret, hashRecoveryCode, hotp, verifyTotp } from "../lib/totp";

process.env.ADMIN_SESSION_SECRET = "a-long-random-test-secret-0123456789";

// RFC 6238 Appendix B test vectors (SHA-1, secret "12345678901234567890"), last 6 digits of the 8-digit values.
const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));
for (const [time, code] of [[59, "287082"], [1111111109, "081804"], [1234567890, "005924"], [2000000000, "279037"]] as const) {
  test(`RFC 6238 vector at t=${time}`, () => {
    assert.equal(hotp(base32Decode(rfcSecret), Math.floor(time / 30)), code);
  });
}

test("base32 round-trips", () => {
  const raw = Buffer.from("hello world, this is a test");
  assert.deepEqual(base32Decode(base32Encode(raw)), raw);
});

test("verify accepts +/-1 step of drift, rejects further, rejects bad format, blocks replay", () => {
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 1000 / 30);
  const at = (s: number) => hotp(base32Decode(rfcSecret), s);
  assert.equal(verifyTotp(rfcSecret, at(step), { nowMs: now }), step);
  assert.equal(verifyTotp(rfcSecret, at(step - 1), { nowMs: now }), step - 1);
  assert.equal(verifyTotp(rfcSecret, at(step + 1), { nowMs: now }), step + 1);
  assert.equal(verifyTotp(rfcSecret, at(step + 3), { nowMs: now }), null);
  assert.equal(verifyTotp(rfcSecret, at(step - 3), { nowMs: now }), null);
  assert.equal(verifyTotp(rfcSecret, "12345", { nowMs: now }), null);
  assert.equal(verifyTotp(rfcSecret, "abcdef", { nowMs: now }), null);
  assert.equal(verifyTotp(rfcSecret, at(step), { nowMs: now, afterStep: step }), null); // same step already used
});

test("secrets are encrypted at rest and tampering is detected", () => {
  const blob = encryptSecret("JBSWY3DPEHPK3PXP");
  assert.equal(blob.includes("JBSWY3DPEHPK3PXP"), false);
  assert.equal(decryptSecret(blob), "JBSWY3DPEHPK3PXP");
  assert.notEqual(encryptSecret("JBSWY3DPEHPK3PXP"), blob); // random IV
  const parts = blob.split(".");
  parts[2] = Buffer.from("tampered!!").toString("base64url");
  assert.throws(() => decryptSecret(parts.join(".")));
});

test("recovery code hashing ignores case and spaces", () => {
  assert.equal(hashRecoveryCode("AB12-cd34"), hashRecoveryCode(" ab12-CD34 "));
});
