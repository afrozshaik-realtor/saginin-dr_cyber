import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { listPosts } from "@/lib/blog/posts";
import { getCurrentStudent } from "@/lib/studentAuth";

export const metadata: Metadata = {
  title: { absolute: "Cybersecurity Career Guides | Dr. Cyber" },
  description: "Plain-English guides for adults exploring a career change into IT and cybersecurity.",
  alternates: { canonical: "/blogs" }
};

export default async function BlogIndexPage() {
  const student = await getCurrentStudent();
  const posts = listPosts();
  return (
    <main className="min-h-screen bg-cloud">
      <SiteHeader student={student} />
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-[#101C42]">Cybersecurity Career Guides</h1>
        <p className="mt-2 text-slate-600">Plain-English guides for adults exploring a career change into IT and cybersecurity.</p>
        <ul className="mt-8 space-y-4">
          {posts.map(({ meta }) => (
            <li key={meta.slug} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">{meta.category}</p>
              <h2 className="mt-1 text-xl font-bold text-[#101C42]">
                <a className="hover:underline" href={`/blogs/${meta.slug}`}>{meta.title}</a>
              </h2>
              <p className="mt-2 text-slate-600">{meta.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
