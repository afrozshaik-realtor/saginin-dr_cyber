import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link className="flex items-center gap-2 font-bold" href="/admin">
          <img className="h-8 w-8 rounded-full" src="/images/logo.jpg" alt="" aria-hidden="true" />
          Dr Cyber Admin
        </Link>
        <div className="flex gap-4 text-sm font-semibold text-slate-600">
          <Link href="/admin/leads">Leads</Link>
          <Link href="/admin/students">Students</Link>
          <Link href="/admin/settings">Settings</Link>
        </div>
      </div>
    </nav>
  );
}
