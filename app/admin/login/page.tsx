import Link from "next/link";
import { redirect } from "next/navigation";
import { adminRegistrationAllowed, startAdminSession, verifyAdmin } from "@/lib/auth";
import { allowRequest, clientIp } from "@/lib/services/rateLimitDb";
import { countAdminUsers } from "@/lib/store";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  // Brute-force protection on the admin login (per IP, and per email).
  if (!(await allowRequest(`adminlogin:ip:${clientIp()}`, 10, 900)) || !(await allowRequest(`adminlogin:email:${email.toLowerCase()}`, 5, 900))) {
    redirect("/admin/login?error=rate");
  }
  if (await verifyAdmin(email, password)) {
    const next = await startAdminSession(email);
    redirect(next === "mfa" ? "/admin/login/mfa" : next === "setup" ? "/admin/security" : "/admin");
  }
  redirect("/admin/login?error=1");
}

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const canRegister = adminRegistrationAllowed() && (await countAdminUsers()) === 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={login} className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Admin login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in with your admin account.</p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3" name="email" type="email" required />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3" name="password" type="password" required />
        </label>
        {searchParams.error ? (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error === "rate" ? "Too many attempts. Wait 15 minutes and try again." : "Invalid login."}
          </p>
        ) : null}
        <button className="mt-6 w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" type="submit">
          Sign in
        </button>
        {canRegister ? (
          <p className="mt-4 text-center text-sm text-slate-600">
            No admin account yet?{" "}
            <Link className="font-semibold text-blueglow" href="/admin/register">
              Create one
            </Link>
          </p>
        ) : null}
      </form>
    </main>
  );
}
