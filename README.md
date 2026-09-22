# TaxiCharg

Driver payment site for NSW taxi drivers: marketing pages, driver log in,
driver dashboard (payments, settlements, reports, withdrawals, profile) and
the Clover / Stripe connect flow.

Built with **Next.js (App Router) + Tailwind CSS**, deployed on **Vercel**.

## How it fits together

Taxi Charge keeps its own pages and its own address. Underneath, there is no
separate database and no back office here: every Taxi Charge person,
terminal, balance and withdrawal is a row in the SYD CABS database, and the
office handles all of it from the SYD CABS panel. A Taxi Charge user never
sees the other brand; the office never keeps anything twice.

| On this site                     | Where it lives                                   |
| -------------------------------- | ------------------------------------------------ |
| A driver / terminal user         | `drivers` row with `brand = 'taxicharge'`        |
| Log in (email + password)        | Supabase Auth, the same login the panel issues   |
| Terminal number and plate        | `clover_terminals` allocated to them (Terminals) |
| Payments and balance             | `takings_reports` and the driver wallet          |
| Withdraw funds                   | `payout_requests`, paid from the panel           |
| Settlements                      | wallet payouts                                   |
| Apply to join (sign-up form)     | an email to the office; the office adds them     |
| Forgot password                  | a Taxi Charge email with a Supabase reset link   |

Adding a Taxi Charge person: in the panel, Drivers > Add, choose brand
**Taxi Charge** (role Terminal user for someone who only cashes out), then
send the login from the panel. The email they get is a Taxi Charge one.

## Environment variables (Vercel > Settings > Environment Variables)

| Name                        | What it is                                                   |
| --------------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`              | the SYD CABS Supabase project URL                            |
| `SUPABASE_SERVICE_ROLE_KEY` | its service_role key (server only - never `NEXT_PUBLIC_`)    |
| `SUPABASE_ANON_KEY`         | its anon key (used only to check a password)                 |
| `AUTH_SECRET`               | a long random string (`openssl rand -base64 32`) for the cookie |
| `TC_SITE_URL`               | this site's address, e.g. `https://taxicharg.com.au`         |
| `TC_SMTP_HOST`, `TC_SMTP_PORT`, `TC_SMTP_USER`, `TC_SMTP_PASS` | the Taxi Charge mailbox (Hostinger: `smtp.hostinger.com`, port 465) |
| `TC_MAIL_FROM`              | e.g. `TaxiCharg <noreply@taxicharg.com.au>`                  |
| `TC_OFFICE_EMAIL`           | where sign-up requests are sent                              |
| `NEXT_PUBLIC_APP_URL`       | this site's address, for the Clover/Stripe redirects         |
| `CLOVER_APP_ID`, `CLOVER_APP_SECRET`, `CLOVER_ENV` | optional; Clover connect is off until set |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional; Stripe connect is off until set   |

Without the mail settings nothing is sent (sign-ups are logged, resets do
nothing) and the site says so in the server log.

## Local development

```bash
npm install
# put the variables above in .env.local
npm run dev
```

## Project structure

```
app/
  page.js, eftpos/, driver-card/, about/, support/, legal/   marketing pages
  login/, signup/, forgot/, reset/                            driver auth pages
  dashboard/                                                  driver dashboard (log in required)
    connect/ payments/ reports/ withdraw/ profile/ help/
  api/
    auth/        login, logout, session, signup (email to office), forgot, reset
    driver/      withdraw (payout request), profile (ABN, phone)
    clover/      Clover OAuth connect + callback
    stripe/      Stripe Connect onboarding + callback + webhook
components/      site/ (marketing) and dashboard/
lib/
  supabase.js    the SYD CABS database (service role, server only)
  mail.js        Taxi Charge email (SMTP)
  auth.js        session cookie + signed OAuth state (jose)
  driverSession.js
  clover.js, stripe.js
  data/          drivers, payments, withdrawals, reports - all read the shared database
proxy.js         log-in check for /dashboard; /admin redirects to /login
```

## Customising the site

- Copy lives in the `.js` files under `app/` and `components/`.
- Colours and fonts: `app/globals.css` (`--navy-*`, `--orange-*`).
- A new dashboard tab: a folder under `app/dashboard/` and a link in
  `components/dashboard/DashboardShell.js`.
- Logo: `public/logo.png`.
