import { redirect } from "next/navigation";

export default function SignupPage({ searchParams }: { searchParams: { redirect?: string } }) {
  const redirectTo = searchParams.redirect || "/courses";
  redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
}
