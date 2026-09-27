import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions/lms";

export default function ForgotPasswordPage({
  searchParams
}: {
  searchParams: { sent?: string; error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email and we&apos;ll send you a reset link.</p>

        {searchParams.error === "expired" ? (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            That reset link has expired. Request a new one below.
          </p>
        ) : null}

        {searchParams.sent ? (
          <p className="mt-4 rounded bg-mint/10 p-3 text-sm text-emerald-700">
            If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).
          </p>
        ) : (
          <form action={forgotPasswordAction}>
            <label className="mt-6 block text-sm font-semibold">
              Email
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3" name="email" type="email" required />
            </label>
            <button className="mt-6 w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" type="submit">
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link className="font-semibold text-blueglow" href="/login">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
