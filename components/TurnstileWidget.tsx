"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

/**
 * Cloudflare Turnstile. Renders the challenge and keeps a hidden `cf-turnstile-response` input in the
 * surrounding <form>, which the server action verifies. Renders nothing if no site key is configured (local dev).
 */
export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!siteKey) return;
    let widgetId: string | null = null;
    let cancelled = false;

    function mount() {
      if (cancelled || !box.current || !window.turnstile) return false;
      widgetId = window.turnstile.render(box.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          if (input.current) input.current.value = token;
        },
        "expired-callback": () => {
          if (input.current) input.current.value = "";
        }
      });
      return true;
    }

    if (!document.querySelector('script[data-turnstile]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.turnstile = "1";
      document.head.appendChild(script);
    }
    const timer = setInterval(() => {
      if (mount()) clearInterval(timer);
    }, 200);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <div>
      <div ref={box} />
      <input ref={input} type="hidden" name="cf-turnstile-response" />
    </div>
  );
}
