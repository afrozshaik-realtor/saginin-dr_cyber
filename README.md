# Dr Cyber

Marketing automation MVP for a cybersecurity career-switch funnel. It includes a landing page, 10-question pathway quiz, lead capture, personalized result page, email/SMS-ready automation, CRM-style admin dashboard, webhook endpoints, PostgreSQL/Supabase schema, and a built-in LMS for hosting the online courses.

## LMS (Online Courses)

- `/courses` - public course catalog. Each of the 8 career pathways is available as a paid, self-paced course with modules, lessons, and portfolio projects.
- `/courses/[slug]` - course landing page with the full curriculum outline and an "Enroll - $price" call to action that starts Stripe Checkout.
- `/signup` and `/login` - student accounts, separate from the admin login, stored with a bcrypt password hash and a signed session cookie. `/forgot-password` and `/reset-password` handle self-service password resets via a signed, 1-hour email link (`createPasswordResetToken`/`verifyPasswordResetToken` in `lib/studentAuth.ts`); the request form always shows the same confirmation regardless of whether the email is registered, so it can't be used to check who has an account.
- `/dashboard` - a logged-in student's enrolled courses with a progress bar and what was paid per course.
- `/learn/[slug]` - the lesson player: a sidebar with every module/lesson, lesson content, and a "Mark lesson complete" action that updates progress instantly.
- `/admin/students` - admin view of every student, their enrollments, and total paid.
- `/admin/courses` - full course editor: create/edit courses, and add, reorder, edit, or delete modules and lessons of any kind.
- `/admin/submissions` - review assignment submissions and leave feedback.

Courses, modules, and lessons are stored as data (JSON store locally, or the `courses` table - as a JSON column - in Postgres), managed entirely from `/admin/courses`. The catalog is seeded once, the first time the store is read, from the pathway roadmaps in `lib/config/pathways.ts` (via `lib/config/courses.ts`) - after that, `lib/config/courses.ts` is no longer the source of truth; edit content in the admin UI instead.

### Lesson kinds

Each lesson is one of five kinds, picked when you add it in `/admin/courses`:

- **Text** - a reading, rendered as formatted text.
- **Video** - paste a YouTube, Vimeo, or Loom URL; it's converted to an embeddable player automatically (`lib/embeds.ts`).
- **Slides** - an embeddable URL (a Google Slides "Publish to web" embed link, or a PDF URL) shown in an iframe.
- **Quiz** - multiple-choice questions built in the admin UI (`components/QuizBuilder.tsx`); students submit answers, get auto-graded instantly, and can retake it (every attempt is kept, `/admin` doesn't currently expose quiz history but it's in the store).
- **Assignment** - written instructions plus a submission type: a link, a text response, or a file upload. Submitting marks the lesson complete immediately; `/admin/submissions` is where you review it and leave feedback afterward.

Text/video/slides lessons keep the manual "Mark lesson complete" button; quiz and assignment lessons complete automatically on submission.

### File uploads

Assignment file submissions are saved to local disk (`.data/uploads/`, via `lib/services/storage.ts`) and served through an authenticated route (`GET /api/uploads/[...path]`) that only the submitting student or an admin can download from. This works out of the box with no extra setup, but the files live on the app server's disk only - not backed up, and lost if the server's disk is wiped (e.g. some platforms reset ephemeral storage on redeploy; verify yours doesn't before relying on this for real submissions). For real production use, swap `lib/services/storage.ts` for an S3-compatible bucket (Cloudflare R2, AWS S3) behind the same two functions.

### Payments (Stripe)

Courses are paid. Set:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- "Enroll" starts a Stripe Checkout session (`lib/services/stripe.ts`) for the course price, with the student's ID/course ID in the session metadata.
- Point a Stripe webhook at `POST /api/webhooks/stripe` listening for `checkout.session.completed`; it verifies the signature and enrolls the student once payment is confirmed.
- `/checkout/success` also verifies the Checkout Session directly as a fallback (useful locally where the Stripe CLI isn't forwarding webhooks) and enrolls the student if it hasn't happened yet. Enrollment is idempotent either way.
- If `STRIPE_SECRET_KEY` is not set, "Enroll" falls back to enrolling the student directly (marked `dev-mode`, no payment) so the app stays testable without live Stripe keys - unset this before deploying somewhere real users can reach it.
- Course prices live in `lib/config/courses.ts` (`priceCentsByLevel`); change them there.

### Admin-granted access (no payment)

`/admin/students` has a "Grant course access" form: enter an email, optionally a name, and pick a course. On submit it:

1. Enrolls that email in the course (creating a student account automatically if the email is new), marked `granted`.
2. Emails them a branded HTML message (logo banner, using `LOGO_URL` if set, otherwise a text wordmark) with a one-click "Start learning" link.
3. That link (`/access/[token]`) is a signed, 7-day magic link - it signs the student in automatically (no password needed) and drops them straight into `/learn/[slug]`.

The site logo lives at `public/images/logo.jpg` and doubles as the favicon (`app/icon.png`), the header/admin-nav mark, and the default email logo - `LOGO_URL` defaults to `{APP_URL}/images/logo.jpg` so branded emails work with no extra config once `APP_URL` is set to a publicly reachable domain (e.g. `https://app.drcyber.ca`). Set `LOGO_URL` explicitly to override it with a different image.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

The MVP uses a local JSON store at `.data/store.json` so the funnel works immediately. For PostgreSQL/Supabase, set `DATABASE_URL`, run Prisma migration, and use `prisma/schema.prisma` plus `prisma/migration.sql` as the database reference.

## Environment Variables

Required for admin:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Recommended funnel settings:

- `APP_URL`
- `BOOKING_LINK`
- `MASTERCLASS_LINK`
- `ADMIN_NOTIFICATION_EMAIL`
- `DEFAULT_SENDER_NAME`
- `PROGRAM_COHORT_NAME`

Email:

- `EMAIL_PROVIDER=console` for local logging
- `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` for Resend
- `EMAIL_FROM`

SMS:

- `SMS_ENABLED=false` by default
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Webhooks:

- `WEBHOOK_SHARED_SECRET` for GoHighLevel/Zapier/Make-style inbound webhook protection

## Database Setup

For Supabase or PostgreSQL:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The requested tables are modeled in `prisma/schema.prisma`:

- `leads`
- `quiz_responses`
- `pipeline_stages`
- `email_logs`
- `sms_logs`
- `admin_users`
- `automation_settings`

The SQL reference is in `prisma/migration.sql`.

## Admin Login

Visit `http://localhost:3000/admin/login`.

Default credentials if no env is set:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Change these before deployment.

## Test The Funnel

1. Open the landing page.
2. Click `Take the Free Dr Cyber Quiz`.
3. Answer all 10 questions.
4. Submit lead details and check the consent box.
5. Confirm redirect to `/result?id=...`.
6. Visit `/admin/login`, sign in, and open `/admin/leads`.
7. Open the lead detail page to verify quiz responses, pathway scores, email logs, SMS logs, notes, and pipeline status.

Email runs in console mode unless a provider is configured. SMS is skipped unless `SMS_ENABLED=true` and Twilio credentials are present.

## Email Provider

Resend is supported by the placeholder provider:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=Dr Cyber Team <hello@yourdomain.com>
```

SendGrid/SMTP can be added by extending `lib/services/email.ts`; the route and logging architecture are already provider-neutral.

## Twilio SMS

Set:

```env
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15555550123
```

If credentials are missing, submissions continue and the SMS log records `missing-credentials`.

## Calendly

Set:

```env
BOOKING_LINK=https://calendly.com/your-team/cyber-career-roadmap-call
```

Point Calendly webhooks to:

```text
POST /api/webhooks/calendly
```

The webhook looks up the invitee email and moves the lead to `Call Booked`.

## GoHighLevel, Zapier, Make.com

Use:

```text
POST /api/webhooks/ghl
```

Send `x-webhook-secret` when `WEBHOOK_SHARED_SECRET` is configured. This endpoint currently logs receipt and is ready to be extended for contact sync, opportunity updates, or tags.

## Deploy

Production target is `app.drcyber.ca` on Hostinger. This is a Next.js app with API routes/server actions/cookies, so it needs a persistent Node.js process - it cannot run on a static/shared-only hosting plan.

### Hostinger VPS (works on any VPS plan)

1. SSH into the VPS (IP/credentials from hPanel -> VPS -> your VPS).
2. Install Node 20+, git, and PM2: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs git && npm install -g pm2`.
3. Clone the repo and `cd` into it, copy `.env.example` to `.env` and fill in real values (at minimum `APP_URL=https://app.drcyber.ca`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `STUDENT_SESSION_SECRET`).
4. `npm install && npm run build`.
5. `pm2 start npm --name dr-cyber -- start && pm2 save && pm2 startup` (app listens on port 3000).
6. Install Nginx and reverse-proxy `app.drcyber.ca` -> `localhost:3000`, then `certbot --nginx -d app.drcyber.ca` for HTTPS.
7. In hPanel -> Domains -> `drcyber.ca` -> DNS Zone Editor, add an A record: name `app`, value = the VPS IP.
8. To redeploy: `git pull && npm install && npm run build && pm2 restart dr-cyber`.

### Hostinger hPanel Node.js app (if your plan has it)

hPanel -> Websites -> your site -> Advanced -> Node.js. Set the app root/startup and env vars there, upload the repo (Git or SFTP), then `npm install && npm run build && npm run start` from the panel's terminal. Point `app.drcyber.ca` at it via the DNS zone editor. Menu names vary by plan/region.

### Either way

- Add all environment variables, including Stripe keys once ready, and register the webhook `https://app.drcyber.ca/api/webhooks/stripe`.
- The app works with its local JSON store out of the box (`.data/store.json`), but that's disk-local and not backed up. For real production data, use a Postgres database (Hostinger doesn't offer managed Postgres - Supabase's free tier is the easiest option, or Postgres on the same VPS), set `DATABASE_URL`, and run `npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed`.
- Configure your email domain/provider and add Calendly/Twilio credentials.

## Editable Funnel Config

- Quiz questions and scoring: `lib/config/quiz.ts`
- Pathway result content: `lib/config/pathways.ts`
- CRM stages: `lib/config/pipeline.ts`
- Email sequence timing: `lib/config/emailSequence.ts`

This keeps scoring and content out of UI components and makes the funnel easy to adjust.
