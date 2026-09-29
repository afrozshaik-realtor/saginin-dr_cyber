import Link from "next/link";
import { redirect } from "next/navigation";
import { hashAdminPassword, setAdminSession } from "@/lib/auth";
import { countAdminUsers, createAdminUser } from "@/lib/store";
import { adminRegisterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function register(formData: FormData) {
  "use server";
  if ((await countAdminUsers()) > 0) {
    redirect("/admin/login");
  }

  const parsed = adminRegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    redirect("/admin/register?error=invalid");
  }

  const passwordHash = await hashAdminPassword(parsed.data.password);
  const admin = await createAdminUser({ name: parsed.data.name, email: parsed.data.email, passwordHash });
  if (!admin) {
    redirect("/admin/register?error=exists");
  }

  setAdminSession();
  redirect("/admin");
}

const errorMessages: Record<string, string> = {
  invalid: "Enter a valid name, email, and password (8+ characters).",
  exists: "An admin account already exists - log in instead."
};

export default async function AdminRegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  if ((await countAdminUsers()) > 0) {
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form action={register} className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 shadow-glow">
        <h1 className="text-2xl font-bold">Create the admin account</h1>
        <p className="mt-2 text-sm text-slate-600">
          First-time setup - this creates the one admin account for this site. Once created, this page stops
          accepting new registrations.
        </p>
        <label className="mt-6 block text-sm font-semibold">
          Name
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
          Create admin account
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-blueglow" href="/admin/login">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
