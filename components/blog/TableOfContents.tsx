import type { BlogTocItem } from "@/lib/blog/types";

function Links({ toc }: { toc: BlogTocItem[] }) {
  return (
    <ol className="space-y-2 text-sm leading-5">
      {toc.map((item) => (
        <li key={item.id}>
          <a className="focus-ring block rounded py-1 text-slate-600 hover:text-[#2563EB]" href={`#${item.id}`}>
            {item.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ toc }: { toc: BlogTocItem[] }) {
  return (
    <>
      <details className="mb-8 rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
        <summary className="focus-ring cursor-pointer text-sm font-bold text-[#101C42]">In this article</summary>
        <nav aria-label="Table of contents" className="mt-3">
          <Links toc={toc} />
        </nav>
      </details>
      <nav aria-label="Table of contents" className="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto lg:block">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">In this article</p>
        <Links toc={toc} />
      </nav>
    </>
  );
}
