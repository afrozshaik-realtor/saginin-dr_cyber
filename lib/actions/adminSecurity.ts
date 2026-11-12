"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearAdminSession, requireAdminAllowSetup } from "@/lib/auth";
import { beginSetup, confirmSetup, disableMfa } from "@/lib/services/adminMfa";
import { allowRequest } from "@/lib/services/rateLimitDb";

export async function startMfaSetupAction() {
  const email = requireAdminAllowSetup();
  await beginSetup(email);
  redirect("/admin/security");
}

export async function confirmMfaAction(formData: FormData) {
  const email = requireAdminAllowSetup();
  if (!(await allowRequest(`adminmfa:setup:${email}`, 8, 900))) redirect("/admin/security?error=rate");
  const codes = await confirmSetup(email, String(formData.get("code") || ""));
  if (!codes) redirect("/admin/security?error=code");
  // Recovery codes are shown once. They travel in a 60-second httpOnly cookie, not a URL (URLs end up in logs/history).
  cookies().set("drcyber_admin_recovery", codes!.join(","), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 60, path: "/admin/security" });
  redirect("/admin/security?recovery=1");
}

export async function disableMfaAction(formData: FormData) {
  const email = requireAdminAllowSetup();
  if (!(await allowRequest(`adminmfa:disable:${email}`, 8, 900))) redirect("/admin/security?error=rate");
  if (!(await disableMfa(email, String(formData.get("code") || "")))) redirect("/admin/security?error=code");
  redirect("/admin/security?disabled=1");
}

export async function adminLogoutAction() {
  clearAdminSession();
  redirect("/admin/login");
}
