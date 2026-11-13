import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp
} from "@/lib/totp";

const norm = (email: string) => email.trim().toLowerCase();

export async function getMfa(email: string) {
  return prisma.adminMfa.findUnique({ where: { email: norm(email) } });
}

export async function isMfaEnabled(email: string) {
  return Boolean((await getMfa(email))?.enabled);
}

/** Start (or restart) enrollment. The factor is NOT active until confirmSetup() succeeds. Refuses to overwrite an active one. */
export async function beginSetup(email: string) {
  const existing = await getMfa(email);
  if (existing?.enabled) return null;
  const secret = generateSecret();
  await prisma.adminMfa.upsert({
    where: { email: norm(email) },
    create: { email: norm(email), secretEnc: encryptSecret(secret) },
    update: { secretEnc: encryptSecret(secret), enabled: false, lastUsedStep: 0, recoveryHashes: "[]" }
  });
  return { secret, uri: otpauthUri(norm(email), secret) };
}

export async function pendingSetup(email: string) {
  const row = await getMfa(email);
  if (!row || row.enabled) return null;
  const secret = decryptSecret(row.secretEnc);
  return { secret, uri: otpauthUri(norm(email), secret) };
}

/** Confirm enrollment with a code from the app. Returns one-time recovery codes (shown once), or null if the code is wrong. */
export async function confirmSetup(email: string, code: string) {
  const row = await getMfa(email);
  if (!row || row.enabled) return null;
  const step = verifyTotp(decryptSecret(row.secretEnc), code.trim());
  if (step === null) return null;
  const codes = generateRecoveryCodes();
  await prisma.adminMfa.update({
    where: { email: norm(email) },
    data: { enabled: true, lastUsedStep: step, recoveryHashes: JSON.stringify(codes.map(hashRecoveryCode)) }
  });
  return codes;
}

/**
 * Check a login code: a TOTP code (each time step usable once) or a single-use recovery code.
 * The "claim" is an atomic conditional update, so two simultaneous requests can't both use the same code.
 */
export async function verifyLoginCode(email: string, input: string) {
  const row = await getMfa(email);
  if (!row?.enabled) return false;
  const code = input.trim();

  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decryptSecret(row.secretEnc), code, { afterStep: Number(row.lastUsedStep) });
    if (step === null) return false;
    const claimed = await prisma.adminMfa.updateMany({
      where: { id: row.id, lastUsedStep: row.lastUsedStep },
      data: { lastUsedStep: step }
    });
    return claimed.count === 1;
  }

  const hash = hashRecoveryCode(code);
  const hashes: string[] = JSON.parse(row.recoveryHashes || "[]");
  if (!hashes.includes(hash)) return false;
  const claimed = await prisma.adminMfa.updateMany({
    where: { id: row.id, recoveryHashes: row.recoveryHashes },
    data: { recoveryHashes: JSON.stringify(hashes.filter((h) => h !== hash)) }
  });
  return claimed.count === 1;
}

/** Turn MFA off. Requires a valid current code. */
export async function disableMfa(email: string, code: string) {
  if (!(await verifyLoginCode(email, code))) return false;
  await prisma.adminMfa.delete({ where: { email: norm(email) } });
  return true;
}

export function remainingRecoveryCodes(row: { recoveryHashes: string } | null) {
  return row ? (JSON.parse(row.recoveryHashes || "[]") as string[]).length : 0;
}
