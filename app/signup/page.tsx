import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { turnstileSiteKey } from "@/lib/services/turnstile";
import { signupAction } from "@/lib/actions/lms";
import { MARKETING_CONSENT_TEXT } from "@/lib/config/crm";
import { getCurrentStudent } from "@/lib/studentAuth";

export const metadata = { title: "Create account | Dr Cyber" };

const errors: Record<string, string> = {
  invalid: "Please enter your name, a valid email, and a password of at least 10 characters (both password fields must match).",
  exists: "An account with that email already exists. Try logging in instead.",
  rate: "Too many sign-up attempts from this network. Please try again later.",
  captcha: "Please complete the security check and try again."
};

export default async function SignupPage({ searchParams }: { searchParams: { redirect?: string; error?: string; source?: string; utm_source?: string } }) {
  const student = await getCurrentStudent();
  const redirectTo = searchParams.redirect?.startsWith("/") ? searchParams.redirect : "/courses";
  const error = searchParams.error ? errors[searchParams.error] : undefined;

  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-md px-6 py-14">
        <h1 className="text-3xl font-bold">Create your account</h1>
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form action={signupAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <input type="hidden" name="source" value={searchParams.utm_source || searchParams.source || ""} />
          <label className="block text-sm font-semibold">
            Name
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type="email" name="email" autoComplete="email" required maxLength={160} />
          </label>
          <label className="block text-sm font-semibold">
            Password (10+ characters)
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type="password" name="password" autoComplete="new-password" required minLength={10} maxLength={100} />
          </label>
          <label className="block text-sm font-semibold">
            Confirm password
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" type="password" name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={100} />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1" type="checkbox" name="emailConsent" />
            <span>{MARKETING_CONSENT_TEXT}</span>
          </label>
          <TurnstileWidget siteKey={turnstileSiteKey()} />
          <SubmitButton className="w-full rounded-md bg-cyan px-5 py-3 font-semibold text-navy hover:bg-mint disabled:opacity-60" pendingText="Creating account...">
            Create account
          </SubmitButton>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account? <Link className="font-semibold text-blueglow" href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Log in</Link>
        </p>
      </section>
    </main>
  );
}
