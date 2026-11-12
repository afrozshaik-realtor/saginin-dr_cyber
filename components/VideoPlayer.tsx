"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlayResponse = { url: string; playbackId: string; resumeAt: number; percent: number };

const HEARTBEAT_MS = 15_000;
const corners = ["left-3 top-3", "right-3 top-3", "left-3 bottom-14", "right-3 bottom-14"];

/**
 * Protected video player. The URL is a short-lived presigned R2 link fetched from the server after an
 * entitlement check; it is refreshed automatically if it expires. A faint moving watermark shows the viewer's email.
 */
export function VideoPlayer({
  lessonId,
  watermark,
  onPoints
}: {
  lessonId: string;
  watermark: string;
  onPoints?: (points: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const playbackId = useRef<string | null>(null);
  const resumeAt = useRef(0);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [earned, setEarned] = useState(0);
  const [corner, setCorner] = useState(0);

  const loadLink = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/lessons/${lessonId}/play`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || (res.status === 401 ? "Please log in again." : "You don't have access to this video."));
      return;
    }
    const data = (await res.json()) as PlayResponse;
    playbackId.current = data.playbackId;
    resumeAt.current = data.resumeAt;
    setPercent(data.percent);
    setSrc(data.url);
  }, [lessonId]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const report = useCallback(
    async (end = false) => {
      const video = videoRef.current;
      if (!video || !playbackId.current) return;
      const body = JSON.stringify({ playbackId: playbackId.current, position: video.currentTime || 0, end });
      if (end && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/lessons/${lessonId}/progress`, new Blob([body], { type: "application/json" }));
        return;
      }
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: end
      }).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { percent: number; awardedPoints: number };
      setPercent(data.percent);
      if (data.awardedPoints > 0) {
        setEarned(data.awardedPoints);
        onPoints?.(data.awardedPoints);
      }
    },
    [lessonId, onPoints]
  );

  useEffect(() => {
    const heartbeat = setInterval(() => report(false), HEARTBEAT_MS);
    const mover = setInterval(() => setCorner((c) => (c + 1) % corners.length), 25_000);
    const leave = () => report(true);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(heartbeat);
      clearInterval(mover);
      window.removeEventListener("pagehide", leave);
      report(true);
    };
  }, [report]);

  // Expired/failed link: fetch a fresh one and resume where we were.
  function onError() {
    resumeAt.current = videoRef.current?.currentTime ?? resumeAt.current;
    loadLink();
  }

  return (
    <div>
      <div ref={boxRef} className="relative aspect-video overflow-hidden rounded-lg bg-black" onContextMenu={(e) => e.preventDefault()}>
        {src ? (
          <video
            ref={videoRef}
            key={src}
            className="h-full w-full"
            src={src}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            onLoadedMetadata={(e) => {
              if (resumeAt.current > 0) e.currentTarget.currentTime = resumeAt.current;
            }}
            onPause={() => report(false)}
            onEnded={() => report(false)}
            onError={onError}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
            {error ?? "Loading video..."}
          </div>
        )}
        {src ? (
          <>
            <div className={`pointer-events-none absolute select-none text-xs font-semibold text-white/20 ${corners[corner]}`}>
              {watermark}
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 hidden rounded bg-black/40 px-2 py-1 text-xs text-white/80 hover:bg-black/60 sm:block"
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : boxRef.current?.requestFullscreen())}
            >
              Fullscreen
            </button>
          </>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Watched: {percent}%</span>
        {earned > 0 ? <span className="text-emerald-600">+{earned} points earned!</span> : <span>Watch 90% to earn points</span>}
      </div>
    </div>
  );
}
