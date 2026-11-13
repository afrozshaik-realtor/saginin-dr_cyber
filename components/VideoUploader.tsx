"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const allowed = ["video/mp4", "video/webm", "video/quicktime"];

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => reject(new Error("Could not read the video file"));
    video.src = URL.createObjectURL(file);
  });
}

/** Admin: browser -> R2 direct upload via a presigned PUT, then attach the stored key to a new lesson. */
export function VideoUploader({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(10);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = progress !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    if (!allowed.includes(file.type)) return setMessage("Use an MP4, WebM or MOV video.");
    setMessage(null);
    setProgress(0);
    try {
      const durationSeconds = await readDuration(file);
      const sign = await fetch("/api/admin/video/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, contentType: file.type })
      });
      if (!sign.ok) throw new Error("Could not get an upload URL");
      const { key, url } = await sign.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Upload failed - check the R2 bucket's CORS settings"));
        xhr.send(file);
      });

      const attach = await fetch("/api/admin/video/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title: title.trim(), r2Key: key, durationSeconds, points })
      });
      if (!attach.ok) throw new Error((await attach.json().catch(() => ({}))).error || "Could not attach the video");
      setTitle("");
      setFile(null);
      setMessage("Lesson added.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-bold">Add a video lesson</h2>
      <input className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
      <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      <label className="block text-sm font-semibold">
        Points for completing this lesson
        <input className="ml-2 w-24 rounded-md border border-slate-300 px-2 py-1" type="number" min={0} max={1000} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
      </label>
      <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} type="submit">
        {busy ? `Uploading... ${progress}%` : "Upload and add lesson"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
