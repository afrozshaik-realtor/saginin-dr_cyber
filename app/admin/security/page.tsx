import { cookies } from "next/headers";
import { AdminNav } from "@/components/AdminNav";
import { adminLogoutAction, confirmMfaAction, disableMfaAction, startMfaSetupAction } from "@/lib/actions/adminSecurity";
import { requireAdminAllowSetup } from "@/lib/auth";
import { getMfa, pendingSetup, remainingRecoveryCodes } from "@/lib/services/adminMfa";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = { code: "That code was not valid. Check your phone's clock and try again.", rate: "Too many attempts. Wait 15 minutes." };

export default async function AdminSecurityPage({
  searchParams
}: {
  searchParams: { error?: string; recovery?: string; disabled?: string };
}) {
  const email = requireAdminAllowSetup();
  const row = await getMfa(email);
  const enabled = Boolean(row?.enabled);
  const pending = enabled ? null : await pendingSetup(email);
  const required = process.env.ADMIN_REQUIRE_MFA === "true";
  const recovery = searchParams.recovery ? (cookies().get("drcyber_admin_recovery")?.value ?? "").split(",").filter(Boolean).slice(0, 12) : [];

  return (
    <main className="min-h-screen bg-cloud">
      <AdminNav />
      <section className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-sm text-slate-600">Signed in as {email}</p>
        {searchParams.error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errors[searchParams.error] ?? "Something went wrong."}</p> : null}
        {searchParams.disabled ? <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Two-step verification is off.</p> : null}
        {required && !enabled ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Two-step verification is required before you can use the admin area. Set it up below.</p>
        ) : null}

        {recovery.length > 0 ? (
          <div className="rounded-lg border-2 border-amber-400 bg-white p-5">
            <h2 className="font-bold">Save your recovery codes now</h2>
            <p className="mt-1 text-sm text-slate-600">Each works once if you lose your phone. They are shown only this one time.</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">{recovery.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Authenticator app (TOTP)</h2>
          {enabled ? (
            <>
              <p className="mt-2 text-sm text-emerald-700">On. {remainingRecoveryCodes(row)} recovery codes left.</p>
              <form action={disableMfaAction} className="mt-4 flex gap-2">
                <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="code" placeholder="Current code to turn off" required maxLength={12} />
                <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Turn off</button>
              </form>
            </>
          ) : pending ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                In your authenticator app (Google Authenticator, 1Password, Authy...) add an account using &quot;enter a setup key&quot;, then type the 6-digit code it shows.
              </p>
              <p className="mt-3 break-all rounded bg-slate-50 p-3 font-mono text-sm">{pending.secret}</p>
              <p className="mt-1 text-xs text-slate-500">Or open on your phone: <a className="text-blueglow underline" href={pending.uri}>add to app</a> (type: time-based, 6 digits, 30 seconds)</p>
              <form action={confirmMfaAction} className="mt-4 flex gap-2">
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 tracking-widest" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required maxLength={6} />
                <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Turn on</button>
              </form>
            </>
          ) : (
            <form action={startMfaSetupAction} className="mt-3">
              <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Set up two-step verification</button>
            </form>
          )}
        </div>

        <form action={adminLogoutAction}>
          <button className="text-sm font-semibold text-slate-600 underline" type="submit">Log out</button>
        </form>
      </section>
    </main>
  );
}
