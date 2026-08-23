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
- **Driver login/signup** (`/login`, `/signup`) backed by a real Postgres
  database, with a demo account seeded in for zero-setup testing.
- **Driver dashboard** (`/dashboard`) with Overview, Payments (Transactions
  & Settlements), Reports, Withdraw Funds, Profile, Connect (Clover &
  Stripe), and Help tabs.
- **Clover & Stripe "plugin"** &mdash; real OAuth connect flows
  (`/api/clover/*`, `/api/stripe/*`) that work as soon as you add your API
  keys as environment variables. Until then they run in demo mode.
- **Admin back-office** (`/admin`) &mdash; Overview, Payments,
  Reconciliation, Drivers (create/reset password/disable), Vehicles &
  terminals, and Settings & status, all separate login from the driver
  dashboard.

## Demo logins

| Role   | Email                        | Password       |
| ------ | ----------------------------- | -------------- |
| Driver | driver@taxicharg.com.au       | TaxiCharg123   |
| Admin  | admin@taxicharg.com.au        | AdminTaxi123   |

Both are seeded into the database by `npm run db:seed` (see **Database**
below) — see `scripts/seed.mjs` to change them or add more.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values as you get them (see below)
npm run db:migrate           # create the database tables (see Database below)
npm run db:seed              # load the demo drivers/vehicles/withdrawal history
npm run dev
```

Open http://localhost:3000.

## Database

Driver accounts, vehicle/terminal assignments, and withdrawal history are
stored in a real Postgres database — this is what makes profile edits,
Clover/Stripe connection status, admin-created drivers, and withdrawals
actually stick around, instead of resetting every time the app restarts.
(Trip/payment history in `lib/data/payments.js` is still generated demo
data for now, since nothing writes to it yet — see that file's comments.)

**Local development:** any Postgres server works. Point `POSTGRES_URL` (or
`DATABASE_URL`) in `.env.local` at it, e.g.
`postgres://user:password@localhost:5432/taxicharg`, then run
`npm run db:migrate` once to create the tables and `npm run db:seed` once
to load the demo accounts. Both are safe to run again later — they never
overwrite existing data.

**On Vercel:** open your project → **Storage** tab → **Create Database** →
choose **Postgres**. Vercel connects it to your project and adds the
`POSTGRES_URL` environment variable for you automatically — you don't
type in a connection string yourself. After it's connected:

1. Redeploy (so the new env var takes effect).
2. Run the migration and seed once against that database. The simplest
   way without installing anything extra: in Vercel → your project →
   Storage → your database → **Query** tab, paste the contents of
   `lib/db/schema.sql` and run it — that's the migration. Then run
   `node scripts/seed.mjs` from your own machine with `POSTGRES_URL` set
   to the connection string shown in that same Storage tab (or ask
   Claude to do this step with you).

## Deploying: GitHub → Vercel

1. Push this project to a GitHub repository.
2. In Vercel, "Add New Project" → import that repository. Vercel
   auto-detects Next.js, so the default build settings work as-is
   (build command `next build`, output handled automatically).
3. Add a Postgres database from the **Storage** tab (see **Database**
   above) — this sets `POSTGRES_URL` for you.
4. In the Vercel project's **Settings → Environment Variables**, add the
   remaining variables from `.env.example` (at minimum `AUTH_SECRET` and
   `NEXT_PUBLIC_APP_URL` — set the latter to your real Vercel/production
   URL once you know it).
5. Deploy. Every push to your main branch redeploys automatically.
6. Run the migration + seed once against the new database (see
   **Database** above).

## Environment variables

See `.env.example` for the full list with explanations.

- `POSTGRES_URL` (or `DATABASE_URL`) — your Postgres connection string;
  see **Database** above. Required for login/dashboard/admin pages to work
  at all once you've moved past local dev with a database already running.
- `CLOVER_APP_ID`, `CLOVER_APP_SECRET`, `CLOVER_ENV` — from your app in
  the [Clover developer dashboard](https://www.clover.com/developers).
  Optional — Clover connect runs in demo mode until these are set.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — from your
  [Stripe dashboard](https://dashboard.stripe.com/apikeys). Optional, same
  as above.
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
    payments/ reports/ withdraw/ profile/ help/
  admin/                    Admin back-office (protected, separate login)
    (dashboard)/             Overview, payments/, reconciliation/, drivers/, vehicles/, settings/
  api/
    auth/                   Driver login/logout/session
    admin/auth/              Admin login/logout
    admin/drivers/            Create driver, reset password, disable/enable
    admin/vehicles/           Create vehicle, assign driver
    clover/                  Clover OAuth connect + callback
    stripe/                  Stripe Connect onboarding + callback + webhook
    driver/withdraw/         Withdraw funds endpoint
    driver/profile/           Edit plate/ABN

components/               UI components (site/ marketing, dashboard/, admin/)

lib/
  auth.js                  Session cookies + signed OAuth state (JWT via `jose`)
  db.js                    Postgres connection pool (reads POSTGRES_URL/DATABASE_URL)
  demoCredentials.js        Demo login constants (kept dependency-free — see its comment)
  clover.js                Clover OAuth helper functions
  stripe.js                Stripe Connect helper functions
  db/schema.sql             Database schema (drivers, vehicles, withdrawals)
  data/                    ⭐ DATA LAYER — see below
    drivers.js               Driver records, credentials, connections (Postgres)
    vehicles.js               Vehicle/terminal assignments (Postgres)
    withdrawals.js            Withdrawal history (Postgres)
    payments.js               Generated transaction ledger (still demo data)
    reports.js                 Aggregates — driver-level and fleet-wide

scripts/
  migrate.mjs               Creates the database tables — run once (npm run db:migrate)
  seed.mjs                   Loads demo drivers/vehicles/withdrawal history — run once (npm run db:seed)
```

### The data layer

Every page and API route reads driver/vehicle/withdrawal data through the
functions in `lib/data/*.js`, never directly — those functions now query a
real Postgres database (see **Database** above), so the same function
names and return shapes are preserved for anything that swaps providers
later. Trip/payment history (`lib/data/payments.js`) is still deterministic
generated demo data, since nothing writes to it yet — the natural next
step there is syncing real transactions from Clover/Stripe.

One thing worth doing before real drivers sign up: replace the plaintext
password check in `verifyDriverPassword` (`lib/data/drivers.js`) with a
real hash comparison (bcrypt/argon2).

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
