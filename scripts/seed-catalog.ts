/**
 * Seeds the 12 mini-courses + 12 course products + 1 bundle, and (if a Stripe TEST key is present)
 * creates the matching Stripe Products/Prices and stores their ids. Safe to re-run.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run seed:catalog
 *
 * - Refuses to run against a live Stripe key.
 * - Never overwrites a course title you have edited in /admin/courses.
 * - Unpublishes the legacy pathway courses (nothing is deleted).
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import {
  BUNDLE_PRICE_CENTS,
  BUNDLE_SLUG,
  MINI_COURSE_PRICE_CENTS,
  PRODUCT_CURRENCY,
  miniCourses
} from "../lib/config/miniCourses";

const prisma = new PrismaClient();

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (/^(sk|rk)_live_/.test(key)) {
    throw new Error("Refusing to run with a LIVE Stripe key. Use a test key (sk_test_...).");
  }
  const stripe = key ? new Stripe(key) : null;
  if (!stripe) console.warn("STRIPE_SECRET_KEY not set - seeding the database only, no Stripe products.");

  // 1) Courses
  for (const mc of miniCourses) {
    await prisma.course.upsert({
      where: { slug: mc.slug },
      update: { sortOrder: mc.sortOrder },
      create: {
        slug: mc.slug,
        title: mc.title,
        category: "Beginner Cybersecurity",
        level: "Beginner",
        summary: "A short, beginner-friendly cybersecurity mini-course.",
        description: "Short video lessons (under 8 minutes each) with points for every lesson you complete.",
        image: mc.image,
        priceCents: MINI_COURSE_PRICE_CENTS,
        currency: PRODUCT_CURRENCY,
        published: true,
        sortOrder: mc.sortOrder,
        modulesJson: []
      }
    });
  }
  const miniSlugs = miniCourses.map((m) => m.slug);
  const hidden = await prisma.course.updateMany({
    where: { slug: { notIn: miniSlugs }, published: true },
    data: { published: false }
  });
  console.log(`Unpublished ${hidden.count} legacy course(s).`);

  const courses = await prisma.course.findMany({ where: { slug: { in: miniSlugs } }, orderBy: { sortOrder: "asc" } });

  // 2) Products: one per course + the bundle
  for (const course of courses) {
    await prisma.product.upsert({
      where: { slug: `course-${course.slug}` },
      update: { title: course.title },
      create: {
        type: "course",
        slug: `course-${course.slug}`,
        title: course.title,
        courseId: course.id,
        priceCents: MINI_COURSE_PRICE_CENTS,
        currency: PRODUCT_CURRENCY
      }
    });
  }
  const bundle = await prisma.product.upsert({
    where: { slug: BUNDLE_SLUG },
    update: {},
    create: {
      type: "bundle",
      slug: BUNDLE_SLUG,
      title: `All ${courses.length} Courses Bundle`,
      priceCents: BUNDLE_PRICE_CENTS,
      currency: PRODUCT_CURRENCY
    }
  });
  await prisma.bundleItem.deleteMany({ where: { productId: bundle.id } });
  await prisma.bundleItem.createMany({ data: courses.map((c) => ({ productId: bundle.id, courseId: c.id })) });

  // 3) Stripe Products/Prices (test mode), idempotent via stored ids + idempotency keys
  if (stripe) {
    const products = await prisma.product.findMany();
    for (const product of products) {
      if (product.stripePriceId) continue;
      const sp = await stripe.products.create(
        { name: product.title, metadata: { productSlug: product.slug, productId: product.id } },
        { idempotencyKey: `seed-product-${product.id}` }
      );
      const price = await stripe.prices.create(
        { product: sp.id, unit_amount: product.priceCents, currency: product.currency },
        { idempotencyKey: `seed-price-${product.id}-${product.priceCents}` }
      );
      await prisma.product.update({
        where: { id: product.id },
        data: { stripeProductId: sp.id, stripePriceId: price.id }
      });
      console.log(`Stripe: ${product.slug} -> ${price.id}`);
    }
  }
  console.log(`Done: ${courses.length} courses, ${courses.length + 1} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
