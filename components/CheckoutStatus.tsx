"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = { status: "pending" | "ready" | "refunded" | "disputed"; courses?: { slug: string; title: string }[] };

/** Polls the read-only status endpoint. Access itself is only ever granted by the Stripe webhook. */
export function CheckoutStatus({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<Status>({ status: "pending" });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Status;
          if (!cancelled) setState(data);
          if (data.status !== "pending") return;
        }
      } catch {
        // keep polling
      }
      if (cancelled) return;
      if (attempts >= 40) return setTimedOut(true);
      setTimeout(poll, 1500);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.status === "ready") {
    return (
      <>
        <h1 className="text-3xl font-bold">You&apos;re in!</h1>
        <p className="mt-3 text-slate-600">Your courses are unlocked.</p>
        <ul className="mt-6 space-y-2">
          {state.courses?.map((c) => (
            <li key={c.slug}>
              <Link className="font-semibold text-blueglow" href={`/learn/${c.slug}`}>{c.title}</Link>
            </li>
          ))}
        </ul>
        <Link className="mt-6 inline-flex rounded-md bg-cyan px-5 py-3 font-semibold text-navy shadow-glow hover:bg-mint" href="/dashboard">
          Go to My Learning
        </Link>
      </>
    );
  }
  if (state.status === "refunded" || state.status === "disputed") {
    return <p className="text-slate-600">This payment was refunded or disputed, so access is not active.</p>;
  }
  return (
    <>
      <h1 className="text-3xl font-bold">Unlocking your courses...</h1>
      <p className="mt-3 text-slate-600">
        {timedOut
          ? "This is taking longer than usual. Your payment is safe - check My Learning in a minute, or contact us if nothing appears."
          : "We're confirming your payment with Stripe. This usually takes a few seconds."}
      </p>
      {timedOut ? (
        <Link className="mt-6 inline-flex rounded-md border border-slate-300 px-5 py-3 font-semibold hover:bg-cloud" href="/dashboard">
          Go to My Learning
        </Link>
      ) : null}
    </>
  );
}
