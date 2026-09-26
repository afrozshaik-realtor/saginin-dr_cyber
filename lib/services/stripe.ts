import Stripe from "stripe";
import type { Course } from "@/types/lms";

let cachedClient: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  cachedClient = secretKey ? new Stripe(secretKey) : null;
  return cachedClient;
}

export async function createCheckoutSession({
  studentId,
  studentEmail,
  course,
  successUrl,
  cancelUrl
}: {
  studentId: string;
  studentEmail: string;
  course: Course;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) return null;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: studentEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: course.currency,
          unit_amount: course.priceCents,
          product_data: {
            name: course.title,
            description: course.summary
          }
        }
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      studentId,
      courseId: course.id,
      courseSlug: course.slug
    }
  });
}
