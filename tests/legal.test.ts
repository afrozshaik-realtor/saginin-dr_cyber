import assert from "node:assert/strict";
import { test } from "node:test";
import { legalVars, privacyDoc, refundDoc, termsDoc } from "../lib/config/legal";

const flat = (d: { intro: string; sections: { heading: string; paragraphs?: string[]; items?: string[] }[] }) =>
  [d.intro, ...d.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.items ?? [])])].join("\n");

test("unset business details show obvious placeholders, never 'undefined'", () => {
  const v = legalVars({});
  for (const doc of [termsDoc(v), privacyDoc(v), refundDoc(v)]) {
    const text = flat(doc);
    assert.match(text, /\[YOUR LEGAL BUSINESS NAME\]/);
    assert.equal(text.includes("undefined"), false);
    assert.equal(text.includes("NaN"), false);
  }
  assert.equal(v.reviewed, false);
});

test("configured details are filled in and the draft flag clears only on explicit review", () => {
  const v = legalVars({
    BUSINESS_LEGAL_NAME: "Dr Cyber Inc.", BUSINESS_ADDRESS: "1 Main St, Toronto, ON", SUPPORT_EMAIL: "help@drcyber.ca",
    LEGAL_GOVERNING_PROVINCE: "Ontario", REFUND_WINDOW_DAYS: "14", LEGAL_PAGES_REVIEWED: "true", APP_URL: "https://app.drcyber.ca"
  });
  assert.equal(v.reviewed, true);
  assert.equal(v.refundDays, 14);
  const all = [termsDoc(v), privacyDoc(v), refundDoc(v)].map(flat).join("\n");
  assert.match(all, /Dr Cyber Inc\./);
  assert.match(all, /help@drcyber\.ca/);
  assert.match(all, /Province of Ontario/);
  assert.match(all, /within 14 days/);
  assert.equal(all.includes("[YOUR"), false);
});

test("bad refund window falls back to 7 days", () => {
  assert.equal(legalVars({ REFUND_WINDOW_DAYS: "abc" }).refundDays, 7);
  assert.equal(legalVars({ REFUND_WINDOW_DAYS: "-3" }).refundDays, 7);
});

test("the pages describe the behavior the app really has", () => {
  const v = legalVars({});
  const refunds = flat(refundDoc(v));
  assert.match(refunds, /switches off access/);
  assert.match(flat(termsDoc(v)), /Refund Policy/);
  const privacy = flat(privacyDoc(v));
  for (const word of ["Stripe", "Cloudflare", "Hostinger", "unsubscribe", "hashed password"]) assert.ok(privacy.includes(word), word);
});
