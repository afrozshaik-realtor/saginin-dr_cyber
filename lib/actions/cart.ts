"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCartSlugs, setCartSlugs } from "@/lib/cart";
import { BUNDLE_SLUG } from "@/lib/config/miniCourses";
import { prisma } from "@/lib/prisma";
import { studentIsBlockedForFailures } from "@/lib/services/alerts";
import { allowRequest, clientIp } from "@/lib/services/rateLimitDb";
import { verifyTurnstile } from "@/lib/services/turnstile";
import { getProductsBySlugs, listActiveEntitlementCourseIds } from "@/lib/services/commerce";
import { createCartCheckoutSession } from "@/lib/services/stripe";
import { requireStudent } from "@/lib/studentAuth";

const slugPattern = /^[a-z0-9-]{1,80}$/;

export async function addToCartAction(formData: FormData) {
  const slug = String(formData.get("productSlug") || "");
  if (!slugPattern.test(slug)) redirect("/cart");
  const [product] = await getProductsBySlugs([slug]);
  if (!product) redirect("/courses");
  const current = getCartSlugs();
  // The bundle already contains every course, so it replaces individual courses in the cart.
  setCartSlugs(product.type === "bundle" ? [product.slug] : current.filter((s) => s !== BUNDLE_SLUG).concat(product.slug));
  redirect("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const slug = String(formData.get("productSlug") || "");
  setCartSlugs(getCartSlugs().filter((s) => s !== slug));
  revalidatePath("/cart");
}

export async function switchToBundleAction() {
  setCartSlugs([BUNDLE_SLUG]);
  redirect("/cart");
}

export async function checkoutCartAction(formData: FormData) {
  const student = await requireStudent("/cart");

  // $1 products attract card testing, so: bot challenge, rate limits (per user AND per IP), and a cool-off
  // for anyone whose recent payments keep failing.
  const ip = clientIp();
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") || ""), ip))) redirect("/cart?error=captcha");
  if (
    !(await allowRequest(`checkout:user:${student.id}`, 5, 600)) ||
    !(await allowRequest(`checkout:ip:${ip}`, 10, 600))
  ) {
    redirect("/cart?error=rate");
  }
  if (await studentIsBlockedForFailures(student.id)) redirect("/cart?error=blocked");

  const products = await getProductsBySlugs(getCartSlugs());
  if (products.length === 0) redirect("/cart");

  // Server-side rules: bundle replaces courses; courses the student already owns are dropped.
  const bundle = products.find((p) => p.type === "bundle");
  const owned = new Set(await listActiveEntitlementCourseIds(student.id));
  const legacy = await prisma.enrollment.findMany({ where: { studentId: student.id }, select: { courseId: true } });
  legacy.forEach((e) => owned.add(e.courseId));

  let chosen = bundle ? [bundle] : products.filter((p) => !(p.courseId && owned.has(p.courseId)));
  if (bundle && bundle.bundleItems.every((item) => owned.has(item.courseId))) chosen = [];
  chosen = chosen.filter((p) => p.stripePriceId);
  if (chosen.length === 0) redirect("/cart?error=nothing");

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  let url: string | null = null;
  try {
    const session = await createCartCheckoutSession({
      studentId: student.id,
      studentEmail: student.email,
      lines: chosen.map((p) => ({ productId: p.id, stripePriceId: p.stripePriceId as string })),
      successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/cart?checkout=cancelled`
    });
    url = session?.url ?? null;
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
  }
  if (!url) redirect("/cart?error=checkout");
  redirect(url as string);
}
