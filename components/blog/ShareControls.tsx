import { CopyLinkButton } from "@/components/CopyLinkButton";

export function ShareControls({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const item =
    "focus-ring rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this article" role="group">
      <span className="text-sm font-semibold text-slate-500">Share:</span>
      <a className={item} href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener noreferrer">
        LinkedIn
      </a>
      <a className={item} href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener noreferrer">
        X
      </a>
      <a className={item} href={`mailto:?subject=${t}&body=${u}`}>
        Email
      </a>
      <CopyLinkButton link={url} label="Copy link" className={item} />
    </div>
  );
}
