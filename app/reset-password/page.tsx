import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/lms";

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token || "";

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy px-4">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow text-center">
          <h1 className="text-2xl font-bold">Missing reset link</h1>
          <p className="mt-3 text-sm text-slate-600">
            This page needs a reset link from your email.{" "}
            <Link className="font-semibold text-blueglow" href="/forgot-password">
              Request a new one
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={resetPasswordAction} className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a new password for your account.</p>
        <input type="hidden" name="token" value={token} />
        <label className="mt-6 block text-sm font-semibold">
          New password
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Confirm new password
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
          />
        </label>
        {searchParams.error ? (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            Passwords must match and be at least 8 characters.
          </p>
        ) : null}
        <button className="mt-6 w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" type="submit">
          Reset password
        </button>
      </form>
    </main>
  );
}
