# TaxiCharg

Driver payment solution for NSW taxi drivers &mdash; marketing site, driver
dashboard, Clover/Stripe connect flow, and a basic admin back-office.

Built with **Next.js (App Router) + Tailwind CSS**, deployed on **Vercel**.
Next.js bundles all CSS/JS through its own build pipeline, which is what
fixes the "css/js folder doesn't load on Vercel" problem from a plain
static-HTML deploy &mdash; there's no `public/css` or `public/js` folder to
misconfigure; everything is compiled and hashed automatically.

## What's included

- **Marketing site** (`/`, `/eftpos`, `/driver-card`, `/about`,
  `/support/*`, `/legal/*`) &mdash; styled to match the TaxiCharg brand
  (colors sampled from your logo), structured after taxi1.com.au but with
  original TaxiCharg copy.
- **Driver login/signup** (`/login`, `/signup`) with a demo account, ready
  to swap for a real database.
- **Driver dashboard** (`/dashboard`) with Overview, Payments, Reports,
  Withdraw Funds, Connect (Clover & Stripe), and Help tabs.
- **Clover & Stripe "plugin"** &mdash; real OAuth connect flows
  (`/api/clover/*`, `/api/stripe/*`) that work as soon as you add your API
  keys as environment variables. Until then they run in demo mode.
- **Admin back-office** (`/admin`) &mdash; a driver list and per-driver
  detail view, separate login from the driver dashboard.

## Demo logins

| Role   | Email                        | Password       |
| ------ | ----------------------------- | -------------- |
| Driver | driver@taxicharg.com.au       | TaxiCharg123   |
| Admin  | admin@taxicharg.com.au        | AdminTaxi123   |

These are hardcoded in `lib/data/drivers.js` for demoing the product with
zero setup. See **Going live** below for wiring up real accounts.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values as you get them (see below)
npm run dev
```

Open http://localhost:3000.

## Deploying: GitHub → Vercel

1. Push this project to a GitHub repository.
2. In Vercel, "Add New Project" → import that repository. Vercel
   auto-detects Next.js, so the default build settings work as-is
   (build command `next build`, output handled automatically).
3. In the Vercel project's **Settings → Environment Variables**, add the
   variables from `.env.example` (at minimum `AUTH_SECRET` and
   `NEXT_PUBLIC_APP_URL` — set the latter to your real Vercel/production
   URL once you know it).
4. Deploy. Every push to your main branch redeploys automatically.

## Environment variables

See `.env.example` for the full list with explanations. Nothing is
required to demo the site — mock data and demo logins work out of the
box. To enable real Clover/Stripe connections, add:

- `CLOVER_APP_ID`, `CLOVER_APP_SECRET`, `CLOVER_ENV` — from your app in
  the [Clover developer dashboard](https://www.clover.com/developers).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — from your
  [Stripe dashboard](https://dashboard.stripe.com/apikeys).
- `AUTH_SECRET` — any long random string (`openssl rand -base64 32`),
  used to sign login sessions.
- `NEXT_PUBLIC_APP_URL` — your deployed URL, used to build OAuth redirect
  links.

## Project structure (where to make changes)

```
app/                     Pages & API routes (Next.js App Router)
  page.js                 Homepage
  login/, signup/          Driver auth pages
  dashboard/               Driver dashboard (protected)
    connect/                Clover & Stripe connect UI
    payments/ reports/ withdraw/ help/
  admin/                    Admin back-office (protected, separate login)
  api/
    auth/                   Driver login/logout/session
    admin/auth/              Admin login/logout
    clover/                  Clover OAuth connect + callback
    stripe/                  Stripe Connect onboarding + callback + webhook
    driver/withdraw/         Withdraw funds endpoint

components/               UI components (site/ marketing, dashboard/, admin/)

lib/
  auth.js                  Session cookies + signed OAuth state (JWT via `jose`)
  clover.js                Clover OAuth helper functions
  stripe.js                Stripe Connect helper functions
  data/                    ⭐ MOCK DATA LAYER — see below
    drivers.js               Driver records, credentials, connections
    payments.js               Generated transaction ledger
    reports.js                 Weekly/method aggregates
```

### The mock data layer — and going live with a real database

Every page and API route reads driver/payment data through the functions
in `lib/data/*.js`, never directly. Right now those functions return data
from in-memory arrays (`lib/data/drivers.js`) or a generated ledger
(`lib/data/payments.js`) — enough to demo the whole product with zero
setup, but it resets whenever the server restarts.

To connect a real database (Supabase is a good fit — free tier, works
well with Vercel):

1. Create the equivalent tables (`drivers`, `transactions`, etc.).
2. Rewrite the functions inside `lib/data/*.js` to query that database
   instead of the in-memory arrays — **keep the same function names and
   return shapes** so nothing else in the app needs to change.
3. Replace the plaintext password check in `verifyDriverPassword` with a
   real hash comparison (bcrypt/argon2) once drivers are stored for real.

## The Clover & Stripe "plugin"

- `/dashboard/connect` is where a driver connects each provider.
- Clicking **Connect Clover** sends them to Clover's OAuth screen; on
  approval, `/api/clover/callback` exchanges the code for an access token
  and stores the connection on their driver record.
- Clicking **Connect Stripe** creates a Stripe Express account and sends
  them through Stripe's onboarding; `/api/stripe/callback` checks the
  account status and stores it.
- **Withdraw Funds** uses the connected Stripe account to send a real
  payout once Stripe is configured and connected; otherwise it simulates
  a withdrawal so the flow can be demoed end-to-end.
- `/api/stripe/webhook` is a stub ready for real Stripe webhook events
  (point your Stripe webhook endpoint at
  `https://<your-domain>/api/stripe/webhook`).

## Customising the site

Everything is plain Next.js + Tailwind — no build step beyond the
standard one, so you (or anyone with basic React/JS knowledge) can:

- Edit copy directly in the `.js` files under `app/` and `components/`.
- Change colors/fonts in `app/globals.css` (the `--navy-*` and
  `--orange-*` custom properties drive the whole theme).
- Add a new dashboard tab by adding a folder under `app/dashboard/` and a
  link in `components/dashboard/DashboardShell.js`.
- Swap the logo by replacing `public/logo.png`.

## Connecting a future Flutter app

Every piece of driver data already flows through JSON API routes under
`app/api/` (auth, driver data, withdrawals, Clover/Stripe connect). When
you build the Flutter app, it can call these same endpoints directly —
you may want to add a lightweight `Authorization: Bearer` token flow
alongside the current cookie session (cookies don't travel naturally to
a mobile app), but the underlying data layer and business logic won't
need to change.

## Admin access

The admin back-office at `/admin` is separate from the driver dashboard
and uses its own login/cookie. Add real admin accounts the same way you'd
add real drivers once a database is connected — see `DEMO_ADMIN_CREDENTIALS`
in `lib/data/drivers.js` for the current placeholder.
