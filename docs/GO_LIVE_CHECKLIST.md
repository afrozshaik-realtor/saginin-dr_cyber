# Go-live checklist: course sales, protected video, CRM

**Nothing in this document has been done for you, and nothing is live.** The app only talks to Stripe test mode
until *you* set live keys and `STRIPE_ALLOW_LIVE=true`. Work top to bottom; do not skip the end-to-end test (section 12).
Items marked **[BLOCKER]** must be done before anyone can pay you.

Legend: **YOU** = needs your accounts or a decision. **APP** = already in the code, just configure it.

---

## 1. Blockers found in the final audit
- [ ] **[BLOCKER] Set strong, random secrets in production** (generate with `openssl rand -base64 48`, one per variable):
      `ADMIN_SESSION_SECRET`, `STUDENT_SESSION_SECRET`, `WEBHOOK_SHARED_SECRET`.
      The app now refuses the old public defaults, but without these admin login fails and student sessions reset on every restart.
- [ ] **[BLOCKER] Set your admin login explicitly:** `ADMIN_EMAIL` plus `ADMIN_PASSWORD_HASH` (preferred; a bcrypt hash) or `ADMIN_PASSWORD`.
      In production the built-in `admin@example.com / ChangeMe123!` login is disabled.
      Generate a hash: `node -e "console.log(require('bcryptjs').hashSync(process.argv[1],12))" 'your-long-password'`
- [ ] **[BLOCKER] Leave `ALLOW_ADMIN_REGISTER=false`.** If it were open, anyone could create the first admin account.
- [ ] **[BLOCKER] Terms, Privacy and Refund pages exist as UNREVIEWED DRAFTS** at `/terms`, `/privacy`, `/refunds`. Fill in the business details, decide the refund window, get a lawyer to review, then clear the draft banner (section 9).
- [ ] **[BLOCKER] The 12 course titles are placeholders** ("Mini-Course 01 (rename me)") and have no videos (section 3).
- [ ] **Turn on admin two-step verification** (section 11): log in, open `/admin/security`, enroll your authenticator app, save the recovery codes, then set `ADMIN_REQUIRE_MFA=true`.

## 2. Infrastructure (Hostinger)
- [ ] **YOU** Confirm the Node.js app type in hPanel runs `app.drcyber.ca` (you confirmed the plan has it; verify the app actually starts).
- [ ] **YOU** Use a **separate production database**. Do not reuse the dev/test one: it contains test students, orders and Stripe *test* ids.
- [ ] **YOU** Take a database backup (hPanel -> Databases) before the first `prisma db push`.
- [ ] Deploy the `claude/trusting-goodall-skp8n1` branch (review and merge it yourself), then `npm install && npm run build`
      (the build is already limited to 1 worker for Hostinger), then `npx prisma db push` against the production `DATABASE_URL`.
- [ ] `APP_URL=https://app.drcyber.ca`, HTTPS forced, `NODE_ENV=production` (the `npm start` default).
- [ ] Verify headers: `curl -sI https://app.drcyber.ca | grep -iE "strict-transport|x-frame|x-content-type|content-security"`.
- [ ] Confirm the host passes the real client IP in `X-Forwarded-For` (rate limits are per IP; if everyone looks like one IP they would throttle each other).
      Test: sign up 6 times from your own network and from a phone on mobile data; only the first network should hit the limit.
- [ ] Decide where the Node process logs go and who reads them (the app logs `[ALERT]` lines and webhook errors there).

## 3. Content
- [ ] **YOU** Rename the 12 courses (title, summary, description, image) in `/admin/courses`. Slugs (`mini-course-01`...) stay as the stable IDs.
- [ ] **YOU** Upload every video at `/admin/courses/<id>/videos` (each under 8 minutes). Check each lesson's **duration** and **points** show correctly.
      Points are only awarded for lessons whose duration is set.
- [ ] Confirm the 8 old pathway courses are unpublished (`/courses` must show only the 12 + bundle).
- [ ] Watch one whole lesson as a test student: progress reaches 90%, "+N points" appears once, replaying never awards again.

## 4. Stripe: switching to live
Do all of this in the Stripe Dashboard with **test mode OFF**. Never paste live keys into chat, a ticket or a commit.
- [ ] **YOU** Finish Stripe account activation (business details, bank account, identity). Confirm payouts currency and that **USD** is a supported presentment currency on your account.
- [ ] **YOU** Confirm Stripe accepts a **$1.00 USD** charge on your account and what the fee is (fixed fee + percentage). Make sure $1 and $9 are worth it. This was never verified.
- [ ] **YOU** Dashboard -> Settings -> Public details: business name, support email/phone, **statement descriptor** (e.g. `DRCYBER.CA`), customer receipts on.
- [ ] **YOU** Turn on the Radar rules in `docs/STRIPE_RADAR.md`.
- [ ] Set production env: `STRIPE_SECRET_KEY` (live), `STRIPE_PUBLISHABLE_KEY` (live), `STRIPE_WEBHOOK_SECRET` (section 5). **Do not set `STRIPE_ALLOW_LIVE=true` yet.**
- [ ] Create the live products/prices. The seed script has a deliberate double lock:
      ```bash
      STRIPE_SECRET_KEY=sk_live_... STRIPE_ALLOW_LIVE=true npm run seed:catalog -- --confirm-live
      ```
      Run it once, from your own machine or the host terminal. It detects leftover *test* price ids and recreates them as live ones.
- [ ] Verify in the database that every row in `products` has a `stripe_price_id` starting `price_` and that those exist in the **live** Dashboard -> Product catalog:
      12 courses at $1.00 and the bundle at $9.00, all USD.
- [ ] Only now set `STRIPE_ALLOW_LIVE=true` and restart the app. Until then, live keys are refused by design.

## 5. Stripe webhook: confirm it really reaches `app.drcyber.ca`
- [ ] Dashboard (live mode) -> Developers -> Webhooks -> Add endpoint: `https://app.drcyber.ca/api/stripe/webhook`.
      Events (exactly these):
      `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`,
      `charge.dispute.created`, `payment_intent.payment_failed` (optional: `checkout.session.expired`).
- [ ] Copy the endpoint's signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`, restart.
- [ ] Reachability check (an unsigned request must be *rejected by the app*, not by a firewall):
      `curl -s -o /dev/null -w "%{http_code}\n" -X POST https://app.drcyber.ca/api/stripe/webhook -d '{}'` -> expect **400**.
      A 403/406/503, a Cloudflare challenge page or a Hostinger error page means something in front of the app is blocking it.
- [ ] In the Dashboard click **Send test webhook** -> expect a **200** under "Recent deliveries" (the app answers 200 even for event types it ignores).
- [ ] If the domain is proxied by **Cloudflare**: add a WAF "skip" rule for the path `/api/stripe/webhook` (Bot Fight Mode and managed challenges break webhooks), and do not cache it.
- [ ] If Hostinger's firewall/ModSecurity blocks it, allow Stripe's webhook IPs (list: https://stripe.com/files/ips/ips_webhooks.json) or exempt the path.
- [ ] Keep the old alias `/api/webhooks/stripe` unregistered unless you already used it; it points to the same handler.
- [ ] After the live test purchase (section 12), confirm the delivery shows 200 and the order exists. A failed delivery is retried for up to 3 days, but the buyer waits meanwhile.

## 6. Cloudflare R2 (production)
- [ ] **YOU** Create a **new production bucket** (do not reuse the dev one). Keep it **private**: no public access, `r2.dev` URL disabled, no custom domain attached.
- [ ] **YOU** Create a **bucket-scoped API token** (Object Read & Write on this bucket only, not account-wide, not Admin). Set the video variables `R2_VIDEO_ACCOUNT_ID`, `R2_VIDEO_ACCESS_KEY_ID`, `R2_VIDEO_SECRET_ACCESS_KEY`, `R2_VIDEO_BUCKET_NAME` (all four, or none). Keep the existing `R2_*` variables pointing at the general uploads bucket (assignments, lesson resources); the two buckets and tokens stay separate.
- [ ] CORS on the bucket: allow **only** `https://app.drcyber.ca`, method `PUT`, header `content-type` (JSON in README). Remove `http://localhost:3000` here.
- [ ] Revoke/delete the dev token and dev bucket when you no longer need them.
- [ ] Keep original video files somewhere else too (R2 is not a backup by default).
- [ ] Verify privacy: open an object's plain URL in a private window -> must be denied. Open a play link, wait over an hour, reload -> must stop working (this expiry is enforced by R2 and was never tested against a real bucket).
- [ ] Verify a student without the course gets 403 from `/api/lessons/<id>/play` (see the tests for the exact behavior).

## 7. Email
- [ ] **YOU** Pick the provider (you said you would name it). Today the app supports `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`; another provider means one small class in `lib/services/transactional.ts`.
- [ ] Set `EMAIL_FROM`, and publish **SPF, DKIM and DMARC** DNS records for the sending domain, otherwise receipts will land in spam.
- [ ] Set `ADMIN_NOTIFICATION_EMAIL` (receives the failed-payment burst alert) and `BUSINESS_ADDRESS` (printed on promotional email, required by CASL).
- [ ] Send yourself: welcome email, receipt email, and the 1x1 invitation (needs a consenting test account). Check the unsubscribe link works.
- [ ] `EMAIL_PROVIDER` must not be `console` in production, or no one receives anything (emails would only be logged).

## 8. Cloudflare Turnstile
- [ ] **YOU** Create a production Turnstile widget for `app.drcyber.ca`. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- [ ] **[BLOCKER]** Without the secret, signup and checkout **refuse to work in production** (by design). Never ship Cloudflare's test keys.
- [ ] Test signup and checkout in a real browser, including a phone.

## 9. Legal pages (drafts are in the app, not reviewed)
`/terms`, `/privacy` and `/refunds` are live in the app, linked from the footer, the signup form and the cart. The text was **drafted from what the app really does**; it is **not legal advice** and has **not** been reviewed by a lawyer. A yellow "Draft - not yet reviewed" banner shows on each page until you clear it.
- [ ] **YOU** Set in production: `BUSINESS_LEGAL_NAME`, `BUSINESS_ADDRESS`, `SUPPORT_EMAIL`, `LEGAL_GOVERNING_PROVINCE`. Anything unset shows as a visible `[PLACEHOLDER]` on the page.
- [ ] **YOU** Decide the refund window and set `REFUND_WINDOW_DAYS` (default **7**, which I chose, so it is *your* call). The Refund page promises this to customers; honor it.
- [ ] **YOU / a lawyer** Review all three pages (wording lives in `lib/config/legal.ts`). Points to check specifically:
      the 16+ age limit, governing law, the liability cap, "points may be removed on refund" (the app does **not** remove points automatically), the data-retention wording, and CASL consent wording.
- [ ] After review set `LEGAL_PAGES_REVIEWED=true` to remove the draft banner. Do not set it before.
- [ ] The Refund page matches the app: a **full** refund or a dispute switches access off; a **partial** refund does not. If you give partial refunds, tell customers access stays.
- [ ] Re-read the Privacy page against what you actually use (it names Stripe, Cloudflare, Hostinger, your email provider and your booking provider). Update it if you add tools.
- [ ] The site sets only essential cookies (student session, cart, admin session; Turnstile/Stripe may set their own). Confirm with your lawyer whether a cookie notice is needed.

## 10. Tax
- [ ] **YOU + your accountant** Sales tax / GST / HST on USD digital sales is **not handled by the app and not confirmed**. The app charges exactly $1 / $9 with no tax added.
      Decide: are you registered, do prices include tax, do you need Stripe Tax or invoices, and does selling to buyers in other countries/states change anything.
      Do not go live until this is answered.

## 11. Security hardening
- [ ] **Admin MFA (built in).** `/admin/security` enrolls an authenticator app (Google Authenticator, 1Password, Authy; standard TOTP) and gives 8 one-time recovery codes.
      Enroll **before** setting `ADMIN_REQUIRE_MFA=true` (after that, an admin without MFA can only reach `/admin/security`). Store the recovery codes offline: if you lose both your phone and the codes you must clear the `admin_mfa` row in the database.
      It works for the env-var admin and for registered admins. Cloudflare Access in front of `/admin` is still a good extra layer.
- [ ] Turn on MFA for: Stripe, Cloudflare, Hostinger, GitHub, your email account, and the domain registrar.
- [ ] Rotate everything that was ever used in testing; use **new** values in production, never copied from dev:
      Stripe keys, webhook secret, R2 token, Turnstile keys, session secrets, email API key, database password.
- [ ] Review R2 token scopes (bucket-scoped, Object Read & Write only) and the GitHub repository's access list.
- [ ] Make sure `.env` files are not in git (`git log --all -- .env` should be empty) and the repo is private.
- [ ] Remove or change any test admin/student accounts in the production database.
- [ ] Confirm no `console` email provider, no test Stripe keys, no localhost URLs left in the production environment.

## 12. End-to-end live test (use your own real card)
Do it on the live site with real keys. $1 and $9 purchases you then refund.
1. [ ] Sign up with a fresh email (tick the consent box). Welcome email arrives.
2. [ ] Add one course to the cart, check out with a real card for **$1**. Stripe hosted checkout shows $1.00 USD.
3. [ ] Success page says "Unlocking..." then "You're in!" (webhook worked). Stripe shows the delivery as 200.
4. [ ] `/admin/orders` shows the order; `/admin/students/<id>` shows stage "Bought a course" and the timeline. Receipt email arrives.
5. [ ] Play a lesson: video streams, seeking works, watermark shows your email. A second account **without** the course gets 403.
6. [ ] Watch to 90%: points awarded once; dashboard total updates.
7. [ ] **Refund** the payment in the Stripe Dashboard (full). Within seconds: order = refunded, access gone, video 403.
8. [ ] Buy the **bundle ($9)** with the account that owned one course: it unlocks all 12 and does not duplicate the owned one. Stage = "Bought the bundle".
9. [ ] Refund the bundle; confirm access disappears. (Optionally buy again to confirm re-activation.)
10. [ ] Replay an event from the Dashboard ("Resend") and confirm nothing duplicates.
11. [ ] Click "Book a 1x1": it opens your booking page and logs `clicked_book_1x1`. Book a slot with the same email and confirm the stage moves to "Booked 1x1"
        (needs `CALENDLY_WEBHOOK_SIGNING_KEY`; if Calendly's signature format differs from what the app expects you will see 401s in the Calendly webhook log).
12. [ ] Try failing a payment on purpose (a card the bank declines). Confirm it appears in `/admin/orders` -> Failed payments.
13. [ ] Check Stripe -> Radar -> Reviews and your email for any alert.

## 13. Final go/no-go
Everything above is ticked, **especially** sections 1, 4, 5, 6, 8, 9 and 10, and step 12 passed twice. Then, and only then:
- [ ] Announce / link the site. You are the one who flips the switch; I did not and will not.

## 14. Rollback and kill switch
- **Stop new sales instantly:** `UPDATE products SET active = 0;` (carts empty; checkout refuses). Existing customers keep access.
- **Stop all Stripe activity:** unset `STRIPE_ALLOW_LIVE` (or set it to `false`) and restart; live keys are then refused.
- **Pause the webhook:** disable the endpoint in the Stripe Dashboard (events queue and can be resent later).
- **Revoke someone's access:** `/admin/access`. **Refund:** Stripe Dashboard (full refund revokes access automatically).
- **Bad deploy:** redeploy the previous commit; the schema changes are additive, so old code still runs.

## 15. First 48 hours
- [ ] Watch Stripe -> Payments, Radar -> Reviews and Disputes, and `/admin/orders` several times a day.
- [ ] Watch the app logs for `[ALERT]`, `[stripe] webhook processing failed`, `[ratelimit] blocked` and `[turnstile]` lines.
- [ ] Check that receipts are not landing in spam and that the Stripe webhook delivery success rate is 100%.

## 16. What was NOT verified (be honest with yourself)
These were built and unit/integration tested against a local database only. They have **never** run against the real services:
- Stripe Checkout, the live webhook delivery, Radar behavior, the $1 minimum and fees
- Cloudflare R2 (real uploads, presigned playback, the 1-hour expiry, CORS), Cloudflare Turnstile, Calendly's real signature format
- A real email provider; Hostinger's Node runtime limits, firewall and `X-Forwarded-For` handling
- Browser behavior of the player on iOS/Safari and Android (autoplay, resume, fullscreen, the watermark)

Known limitations you are accepting:
- Partial refunds do not revoke access. Anyone holding a valid video link can use it for up to 1 hour.
- Watermark and "no download" are deterrents, not protection against a determined user.
- No full `script-src` CSP; no admin MFA in the app; legacy (JSON) lessons are not part of the CRM.
- Rate limits are per IP and per account, and a determined attacker with many IPs can still try card testing; that is what Radar is for.
