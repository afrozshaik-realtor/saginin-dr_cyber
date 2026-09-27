"use client";

import { useState } from "react";
import { clsx } from "clsx";

export function CoursePriceFields({
  defaultPriceCents,
  defaultCurrency
}: {
  defaultPriceCents: number;
  defaultCurrency: string;
}) {
  const [isFree, setIsFree] = useState(defaultPriceCents === 0);
  const [priceCents, setPriceCents] = useState(defaultPriceCents || 19900);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isFree} onChange={(event) => setIsFree(event.target.checked)} />
        This course is free
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Price (cents)
          <input
            className={clsx(
              "mt-2 w-full rounded-md border border-slate-300 px-3 py-2",
              isFree && "bg-slate-100 text-slate-400"
            )}
            name="priceCents"
            type="number"
            min={0}
            value={isFree ? 0 : priceCents}
            onChange={(event) => setPriceCents(Number(event.target.value))}
            readOnly={isFree}
            required
          />
          {isFree ? <span className="mt-1 block text-xs font-normal text-slate-500">Locked to 0 while free.</span> : null}
        </label>
        <label className="block text-sm font-semibold">
          Currency
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            name="currency"
            defaultValue={defaultCurrency}
            required
          />
        </label>
      </div>
    </div>
  );
}
