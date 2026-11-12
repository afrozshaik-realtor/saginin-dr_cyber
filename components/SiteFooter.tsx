import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-slate-500">
        <span>&copy; {new Date().getFullYear()} Dr Cyber</span>
        <nav className="flex gap-5">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refunds">Refunds</Link>
        </nav>
      </div>
    </footer>
  );
}
