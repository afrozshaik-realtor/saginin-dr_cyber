import { cookies } from "next/headers";

const COOKIE = "drcyber_cart";
const MAX_ITEMS = 20;

/** The cart is only a list of product SLUGS in a cookie. Prices are always looked up server-side. */
export function getCartSlugs(): string[] {
  const raw = cookies().get(COOKIE)?.value || "";
  return Array.from(new Set(raw.split(",").filter((s) => /^[a-z0-9-]{1,80}$/.test(s)))).slice(0, MAX_ITEMS);
}

export function setCartSlugs(slugs: string[]) {
  const clean = Array.from(new Set(slugs)).slice(0, MAX_ITEMS);
  if (clean.length === 0) {
    cookies().delete(COOKIE);
    return;
  }
  cookies().set(COOKIE, clean.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
}
