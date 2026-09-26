import Link from "next/link";
import { signupAction } from "@/lib/actions/lms";

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid name, email, and password (8+ characters).",
  exists: "An account with that email already exists."
};

export default function SignupPage({
  searchParams
}: {
  searchParams: { error?: string; redirect?: string };
}) {
  const redirectTo = searchParams.redirect || "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={signupAction} className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Create your student account</h1>
        <p className="mt-2 text-sm text-slate-600">Enroll in courses and track your learning progress.</p>
        <input type="hidden" name="redirect" value={redirectTo} />
        <label className="mt-6 block text-sm font-semibold">
          Full name
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3" name="name" required />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Email
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3" name="email" type="email" required />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-3"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        {searchParams.error ? (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {errorMessages[searchParams.error] || "Something went wrong. Try again."}
          </p>
        ) : null}
        <button className="mt-6 w-full rounded-md bg-cyan px-5 py-3 font-bold text-navy hover:bg-mint" type="submit">
          Create account
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-blueglow" href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
