/**
 * Legal page content. DRAFTS written from what the app actually does, NOT reviewed by a lawyer.
 * Business-specific facts come from environment variables; anything unset shows an obvious [PLACEHOLDER].
 * The "draft" banner stays on every page until LEGAL_PAGES_REVIEWED=true.
 */

export const LEGAL_LAST_UPDATED = "2026-11-12";

export type LegalVars = {
  businessName: string;
  address: string;
  supportEmail: string;
  province: string;
  refundDays: number;
  appUrl: string;
  reviewed: boolean;
};

export function legalVars(env: Record<string, string | undefined> = process.env): LegalVars {
  const days = Number(env.REFUND_WINDOW_DAYS);
  return {
    businessName: env.BUSINESS_LEGAL_NAME || "[YOUR LEGAL BUSINESS NAME]",
    address: env.BUSINESS_ADDRESS || "[YOUR BUSINESS MAILING ADDRESS]",
    supportEmail: env.SUPPORT_EMAIL || env.ADMIN_NOTIFICATION_EMAIL || "[YOUR SUPPORT EMAIL]",
    province: env.LEGAL_GOVERNING_PROVINCE || "[YOUR PROVINCE]",
    refundDays: Number.isFinite(days) && days > 0 ? Math.floor(days) : 7,
    appUrl: env.APP_URL || "https://app.drcyber.ca",
    reviewed: env.LEGAL_PAGES_REVIEWED === "true"
  };
}

export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

export function termsDoc(v: LegalVars): LegalDoc {
  return {
    title: "Terms of Service",
    intro: `These terms govern your use of ${v.appUrl} and the courses sold on it ("Dr Cyber", "we", "us"), operated by ${v.businessName}. By creating an account or buying a course you agree to them.`,
    sections: [
      {
        heading: "1. Who can use the service",
        paragraphs: [
          "You must be at least 16 years old, or have a parent or guardian's permission, to create an account. You are responsible for keeping your password secret and for everything done with your account. Give us accurate information and tell us if you think someone else has accessed your account."
        ]
      },
      {
        heading: "2. What you are buying",
        paragraphs: [
          "Dr Cyber sells short, beginner-level cybersecurity video courses. Courses are sold individually or as a bundle of all courses, at the prices shown at checkout, in US dollars (USD). Payment is taken by Stripe; we never see or store your card number.",
          "Access is unlocked only after Stripe confirms your payment, usually within seconds. Your purchase gives you access to the course videos for as long as we offer the course, as described in section 4."
        ]
      },
      {
        heading: "3. Prices and taxes",
        paragraphs: [
          "Prices are shown at checkout and may change at any time; a change does not affect courses you already bought. Taxes, if any apply, are your responsibility unless the checkout shows them as included or added."
        ]
      },
      {
        heading: "4. Your licence to the content",
        paragraphs: [
          "When you buy a course we give you a personal, non-exclusive, non-transferable licence to watch it for your own learning. Everything on the site (videos, text, images, quizzes, branding) belongs to us or our licensors.",
        ],
        items: [
          "Do not share your account or the video links, or let others watch with your login.",
          "Do not download, record, copy, re-upload, resell or publicly show the videos. Videos carry a visible watermark with your email address.",
          "We limit how many devices or tabs can play at the same time on one account.",
          "We may suspend or end access if we reasonably believe these rules are broken, and refund you at our discretion."
        ]
      },
      {
        heading: "5. Points and progress",
        paragraphs: [
          "Points reward completing lessons. They are recorded by our servers when you watch a lesson to the required point. Points have no cash value, cannot be transferred, and we may correct or remove points earned through abuse or errors."
        ]
      },
      {
        heading: "6. Responsible and lawful use",
        paragraphs: [
          "The courses teach cybersecurity concepts for education and defence. You agree to use what you learn only on systems you own or have clear written permission to test, and to follow the laws that apply to you. You are solely responsible for how you use this knowledge."
        ]
      },
      {
        heading: "7. No guarantees",
        paragraphs: [
          "The courses are general education. We do not promise that you will get a job, a certification, a particular income or any other result, and nothing here is professional, legal or career advice. Any 1x1 coaching is a separate service offered on its own terms."
        ]
      },
      {
        heading: "8. Refunds, chargebacks and fraud",
        paragraphs: [
          `Refunds are covered by our Refund Policy at ${v.appUrl}/refunds. If a payment is fully refunded, reversed, or disputed with your bank, access to what that payment unlocked is switched off automatically. Please contact us before starting a dispute so we can fix problems quickly.`,
          "We may refuse or cancel orders and accounts that look fraudulent or abusive (for example repeated failed payments or card testing)."
        ]
      },
      {
        heading: "9. Availability and changes",
        paragraphs: [
          "We aim to keep the service running but it is provided \"as is\"; it may be unavailable for maintenance or reasons outside our control. We may update, replace or retire courses and these terms. If we change these terms in a way that matters, we will post the new version here and update the date above; continuing to use the service after that means you accept it."
        ]
      },
      {
        heading: "10. Liability",
        paragraphs: [
          "To the fullest extent the law allows, we are not liable for indirect or consequential losses, lost income or lost opportunities, and our total liability for any claim relating to a course is limited to the amount you paid for it. Nothing in these terms limits rights you have under consumer protection law that cannot be limited."
        ]
      },
      {
        heading: "11. Governing law",
        paragraphs: [
          `These terms are governed by the laws of the Province of ${v.province} and the federal laws of Canada that apply there, and disputes will be handled by the courts there, subject to any mandatory rights you have where you live.`
        ]
      },
      {
        heading: "12. Contact",
        paragraphs: [`${v.businessName}, ${v.address}. Email: ${v.supportEmail}.`]
      }
    ]
  };
}

export function privacyDoc(v: LegalVars): LegalDoc {
  return {
    title: "Privacy Policy",
    intro: `${v.businessName} ("we") runs ${v.appUrl}. This policy explains what personal information we collect, why, who we share it with, and the choices you have. We aim to handle personal information in line with Canadian privacy law (such as PIPEDA) and anti-spam law (CASL).`,
    sections: [
      {
        heading: "1. What we collect",
        items: [
          "Account details: your name, email address, and a securely hashed password (we cannot read your password).",
          "Purchases: which courses or bundle you bought, the amount, the date and the status (paid, refunded, disputed). Card details are handled by Stripe and never reach our servers.",
          "Learning activity: which lessons you started and finished, how much of each video you watched, and the points you earned.",
          "Email preferences: whether you agreed to marketing email, when, how, and the exact wording you agreed to (so we can prove consent).",
          "If you took our career quiz: your quiz answers and contact details, which we match to your account by email address.",
          "If you book a call: your name and email are passed to our booking provider so your booking can be matched to your account.",
          "Technical and security data: your IP address and request counts used for rate limiting and fraud prevention (kept about a day), plus records of failed payments. Our servers also log requests and errors.",
          "Messages you send us, and notes we make about our contact with you."
        ]
      },
      {
        heading: "2. Why we use it",
        items: [
          "To create your account, take payment, unlock your courses and show your progress and points.",
          "To send transactional email you need: a welcome message and your receipt or access confirmation.",
          "To prevent fraud and abuse, including card testing, account sharing and video piracy.",
          "To understand how our courses are used and to follow up about coaching, by tracking a simple customer journey (signed up, bought, completed, booked).",
          "To send marketing email, only if you opted in. You can withdraw consent at any time (section 6).",
          "To meet legal, tax and accounting obligations."
        ]
      },
      {
        heading: "3. Who we share it with",
        paragraphs: ["We do not sell your personal information. We use these service providers, who process it for us:"],
        items: [
          "Stripe (payments, fraud screening and receipts).",
          "Cloudflare (bot protection with Turnstile, and private storage and delivery of the course videos).",
          "Hostinger (website and database hosting).",
          "Our email provider (sending the emails described above).",
          "Our booking provider (scheduling 1x1 calls), if you choose to book.",
          "Professional advisers, and authorities where the law requires it."
        ]
      },
      {
        heading: "4. Where it is processed",
        paragraphs: [
          "Some of these providers process information outside Canada, including in the United States, where it may be accessible to courts and authorities under local law."
        ]
      },
      {
        heading: "5. Cookies",
        paragraphs: [
          "We use only essential cookies: one that keeps you logged in, one that remembers your shopping cart, and (for administrators) an admin session cookie. Our security check (Cloudflare Turnstile) and Stripe's checkout may set their own cookies to work. We do not use advertising cookies."
        ]
      },
      {
        heading: "6. Marketing email and your choices",
        paragraphs: [
          "We send marketing or promotional email (such as an invitation to book a 1x1 session) only if you ticked the consent box at signup or in your dashboard. Every such email has our identity and address and an unsubscribe link that works immediately. Unsubscribing does not stop transactional emails such as receipts."
        ]
      },
      {
        heading: "7. How long we keep it",
        paragraphs: [
          "We keep account and learning data while your account is active. Order records are kept as long as tax and accounting law requires. Short-lived security data (such as rate-limit records) is deleted after about a day. When we no longer need information, we delete or anonymize it."
        ]
      },
      {
        heading: "8. Your rights",
        paragraphs: [
          `You can ask us to see the personal information we hold about you, correct it, or delete your account, and you can withdraw consent at any time, by emailing ${v.supportEmail}. We may need to keep some information (such as order records) where the law requires it. If you are unhappy with how we handle your information you can also contact the Office of the Privacy Commissioner of Canada.`
        ]
      },
      {
        heading: "9. Security",
        paragraphs: [
          "We protect your information with measures such as encrypted connections, hashed passwords, private video storage with short-lived links, and rate limiting. No system is perfectly secure; tell us right away if you suspect a problem."
        ]
      },
      {
        heading: "10. Children",
        paragraphs: ["The service is not meant for children under 16, and we do not knowingly collect their information."]
      },
      {
        heading: "11. Changes and contact",
        paragraphs: [
          `We may update this policy and will post the new version here with a new date. Questions: ${v.businessName}, ${v.address}, ${v.supportEmail}.`
        ]
      }
    ]
  };
}

export function refundDoc(v: LegalVars): LegalDoc {
  return {
    title: "Refund Policy",
    intro: `This policy applies to courses and bundles bought from ${v.businessName} on ${v.appUrl}. Prices are in US dollars (USD).`,
    sections: [
      {
        heading: "1. Our refund promise",
        paragraphs: [
          `If a course is not right for you, ask for a refund within ${v.refundDays} days of purchase and we will refund the payment. Courses are low-priced and short, so we keep this simple: no long forms and no hoops.`
        ]
      },
      {
        heading: "2. How to ask",
        paragraphs: [
          `Email ${v.supportEmail} from the email address on your account and include the date of purchase. We aim to reply within 2 business days. We may ask what went wrong so we can improve, but you do not have to answer to get your refund.`
        ]
      },
      {
        heading: "3. What a refund does",
        items: [
          "Refunds go back to the original payment method through Stripe. Your bank may take several business days to show it.",
          "A full refund switches off access to the courses that payment unlocked. If you bought a bundle, refunding the bundle ends access to the courses it covered. Courses you separately paid for stay unlocked.",
          "Points earned from refunded courses may be removed.",
          "We cannot refund the card processor's fees to you, and refunds are not given in a different currency."
        ]
      },
      {
        heading: "4. When we may say no",
        items: [
          "Requests made after the refund period, unless there was a billing error or a technical problem on our side that we could not fix.",
          "Cases of abuse, such as downloading or sharing the videos, account sharing, or repeated refund requests for courses that were fully watched.",
          "Orders already refunded, or payments already disputed with your bank."
        ]
      },
      {
        heading: "5. Billing problems and double charges",
        paragraphs: [
          "If you were charged twice, or charged but did not get access, email us right away with the details. These are always refunded or fixed, whatever the date."
        ]
      },
      {
        heading: "6. Chargebacks",
        paragraphs: [
          "Please contact us before disputing a charge with your bank. If a payment is disputed or reversed, access to what it unlocked is switched off automatically while the dispute is open."
        ]
      },
      {
        heading: "7. Your legal rights",
        paragraphs: ["This policy does not limit any rights you have under consumer protection law where you live."]
      }
    ]
  };
}
