import Link from "next/link";
import { logoutAction } from "@/lib/actions/lms";
import type { Student } from "@/types/lms";

export function SiteHeader({ student }: { student: Student | null }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="font-bold" href="/">
          Cyber Career Pathway
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold text-slate-600">
          <Link href="/courses">Courses</Link>
          {student ? (
            <>
              <Link href="/dashboard">My Learning</Link>
              <span className="text-slate-400">{student.name}</span>
              <form action={logoutAction}>
                <button className="text-slate-600 hover:text-ink" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link
                className="rounded-md bg-ink px-4 py-2 text-white hover:bg-navy"
                href="/signup"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
