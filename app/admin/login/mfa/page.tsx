import { redirect } from "next/navigation";
import { completeMfaLogin, getMfaPendingEmail } from "@/lib/auth";
import { verifyLoginCode } from "@/lib/services/adminMfa";
import { allowRequest, clientIp } from "@/lib/services/rateLimitDb";

export const dynamic = "force-dynamic";

async function verify(formData: FormData) {
  "use server";
  const email = getMfaPendingEmail();
  if (!email) redirect("/admin/login");
  if (!(await allowRequest(`adminmfa:email:${email}`, 6, 900)) || !(await allowRequest(`adminmfa:ip:${clientIp()}`, 20, 900))) {
    redirect("/admin/login/mfa?error=rate");
  }
  if (await verifyLoginCode(email!, String(formData.get("code") || ""))) {
    completeMfaLogin(email!);
    redirect("/admin");
  }
  redirect("/admin/login/mfa?error=1");
}

export default function AdminMfaPage({ searchParams }: { searchParams: { error?: string } }) {
  if (!getMfaPendingEmail()) redirect("/admin/login");
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={verify} className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Two-step verification</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
        <input
          className="mt-6 w-full rounded-md border border-slate-300 px-3 py-3 tracking-widest"
          name="code" autoComplete="one-time-code" inputMode="text" required maxLength={12} autoFocus
        />
        {searchParams.error ? (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error === "rate" ? "Too many attempts. Wait 15 minutes." : "That code is not valid."}
          </p>
        ) : null}
        <button className="mt-6 w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" type="submit">Verify</button>
      </form>
    </main>
  );
}
