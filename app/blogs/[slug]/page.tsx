import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Figure } from "@/components/blog/Figure";
import { ShareControls } from "@/components/blog/ShareControls";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { MARKETING_SITE_URL, SITE_NAME, getAppUrl } from "@/lib/blog/config";
import { resolveBlogImage } from "@/lib/blog/image-file";
import type { BlogImageKey } from "@/lib/blog/images";
import { getPost, listPosts } from "@/lib/blog/posts";
import { getCurrentStudent } from "@/lib/studentAuth";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return listPosts().map((post) => ({ slug: post.meta.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const { meta } = post;
  const path = `/blogs/${meta.slug}`;
  const hero = resolveBlogImage(meta.heroImageKey as BlogImageKey);
  const images = hero ? [{ url: hero.src, width: hero.width, height: hero.height, alt: hero.alt }] : undefined;
  return {
    title: { absolute: meta.seoTitle },
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: meta.author.name, url: meta.author.url }],
    alternates: { canonical: path },
    robots: meta.status === "published" ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: meta.seoTitle,
      description: meta.description,
      publishedTime: meta.publishedAt,
      modifiedTime: meta.modifiedAt,
      section: meta.category,
      authors: [meta.author.name],
      images
    },
    twitter: {
      card: hero ? "summary_large_image" : "summary",
      title: meta.seoTitle,
      description: meta.description,
      images: hero ? [hero.src] : undefined
    }
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  });
}

export default async function BlogPostPage({ params }: Props) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const { meta, toc, sources, Body } = post;
  const student = await getCurrentStudent();

  const appUrl = getAppUrl();
  const url = `${appUrl}/blogs/${meta.slug}`;
  const hero = resolveBlogImage(meta.heroImageKey as BlogImageKey);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: meta.description,
      ...(hero ? { image: [`${appUrl}${hero.src}`] } : {}),
      author: { "@type": "Organization", name: meta.author.name, url: meta.author.url },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: MARKETING_SITE_URL,
        logo: { "@type": "ImageObject", url: `${appUrl}/images/logo.jpg` }
      },
      datePublished: meta.publishedAt,
      dateModified: meta.modifiedAt,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: meta.category
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${appUrl}/blogs` },
        { "@type": "ListItem", position: 3, name: meta.title, item: url }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader student={student} />
      <header className="bg-gradient-to-br from-[#101C42] via-[#1e2f7a] to-[#2563EB] text-white">
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-10 sm:px-6 sm:pt-14">
          <nav aria-label="Breadcrumb" className="text-sm text-blue-100">
            <a className="hover:underline" href="/blogs">Blog</a>
            <span aria-hidden="true"> / </span>
            <span>{meta.category}</span>
          </nav>
          <p className="mt-5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#7ff2df]">
            {meta.category}
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{meta.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-50">{meta.standfirst}</p>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
            <span>By {meta.author.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              Published <time dateTime={meta.publishedAt}>{formatDate(meta.publishedAt)}</time>
            </span>
            {meta.modifiedAt !== meta.publishedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={meta.modifiedAt}>{formatDate(meta.modifiedAt)}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{meta.readingMinutes} min read</span>
          </p>
          <Figure imageKey={meta.heroImageKey as BlogImageKey} priority className="!mb-0 mt-8" />
        </div>
      </header>

      {meta.status === "draft" ? (
        <p className="bg-amber-100 px-6 py-2 text-center text-sm font-semibold text-amber-900">
          Draft preview — not visible in production.
        </p>
      ) : null}

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside>
          <TableOfContents toc={toc} />
        </aside>
        <article className="min-w-0 max-w-3xl">
          <Body />

          <section aria-labelledby="sources-heading" className="mt-14 border-t border-slate-200 pt-8">
            <h2 id="sources-heading" className="text-xl font-bold text-[#101C42]">Sources</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {sources.map((source) => (
                <li key={source.url}>
                  <a className="font-semibold text-[#2563EB] underline underline-offset-4" href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.name}
                  </a>
                  <span> — {source.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="author-heading" className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 id="author-heading" className="text-lg font-bold text-[#101C42]">About the author</h2>
            <p className="mt-2 text-base leading-7 text-slate-700">
              <strong>{meta.author.name}.</strong> {meta.author.bio}{" "}
              <a className="font-semibold text-[#2563EB] underline underline-offset-4" href={meta.author.url}>
                About Dr. Cyber
              </a>
            </p>
          </section>

          <div className="mt-8">
            <ShareControls url={url} title={meta.title} />
          </div>
        </article>
      </div>
    </main>
  );
}
