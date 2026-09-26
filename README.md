# Cyber Career Pathway Funnel

Marketing automation MVP for a cybersecurity career-switch funnel. It includes a landing page, 10-question pathway quiz, lead capture, personalized result page, email/SMS-ready automation, CRM-style admin dashboard, webhook endpoints, PostgreSQL/Supabase schema, and a built-in LMS for hosting the online courses.

## LMS (Online Courses)

- `/courses` - public course catalog. Each of the 8 career pathways is available as a self-paced course with modules, lessons, and portfolio projects.
- `/courses/[slug]` - course landing page with the full curriculum outline and an "Enroll for free" call to action.
- `/signup` and `/login` - student accounts, separate from the admin login, stored with a bcrypt password hash and a signed session cookie.
- `/dashboard` - a logged-in student's enrolled courses with a progress bar per course.
- `/learn/[slug]` - the lesson player: a sidebar with every module/lesson, lesson content, and a "Mark lesson complete" action that updates progress instantly.
- `/admin/students` - admin view of every student and which courses they're enrolled in.

Course/module/lesson content is defined in code at `lib/config/courses.ts` (derived from the pathway roadmaps in `lib/config/pathways.ts`), while students, enrollments, and lesson progress are stored as data (JSON store locally, or the `students` / `enrollments` / `lesson_progress` tables in Postgres). Enrollment is free in this MVP; wire in Stripe or another billing provider before charging for a course.

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
2. Click `Take the Free Cyber Career Quiz`.
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
EMAIL_FROM=Cyber Career Pathway Team <hello@yourdomain.com>
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

1. Push to GitHub.
2. Import into Vercel.
3. Add all environment variables.
4. Create a Supabase/PostgreSQL database and set `DATABASE_URL`.
5. Run Prisma migration/seed from a local machine or deployment job.
6. Configure your email domain and provider.
7. Add Calendly and optional Twilio credentials.

## Editable Funnel Config

- Quiz questions and scoring: `lib/config/quiz.ts`
- Pathway result content: `lib/config/pathways.ts`
- CRM stages: `lib/config/pipeline.ts`
- Email sequence timing: `lib/config/emailSequence.ts`

This keeps scoring and content out of UI components and makes the funnel easy to adjust.
