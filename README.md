# Wachira

## Storefront: checkout and WhatsApp consultations

Customers click an outfit photo to view its details, then order through checkout or
consult on WhatsApp. Enquiries include the outfit name and page link. Samples without
a price support consultation only; priced products can be added to the bag and paid
for through checkout. Set `NEXT_PUBLIC_WHATSAPP` to the business number including the
country code (digits only) and restart/rebuild the app to activate the links.

The admin dashboard is at `/admin`, protected by staff email-code sign-in. Admins
can upload sample photos, edit descriptions and sizes, and publish or hide designs.
Prices are optional; an empty price is displayed as "Price on consultation".
The dashboard also links to order review and payment verification.

Clothing store built with Next.js, React, Prisma and MongoDB. Customers sign up with
an email and password, verify their email, order standard or made-to-measure pieces,
and pay using M-Pesa. Staff sign in with emailed codes at `/admin`.

## Local development

Use Node.js 24 and pnpm 11.21.0 (pinned in package.json). Keep pnpm-lock.yaml as the
single dependency lockfile.

1. Copy `.env.example` to `.env` if you do not already have one.
2. Set `DATABASE_URL` to MongoDB Atlas or a local MongoDB replica set. Transactions
   are required. A standalone MongoDB server is not supported.
3. Generate separate random values for `AUTH_SECRET`, `MPESA_CALLBACK_SECRET`, and
   `JOBS_SECRET`, each at least 32 characters. Set `ADMIN_EMAILS` to your staff.
4. Run:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Only seed an empty development database. `db:push` updates database indexes; review
its output and do not use `--accept-data-loss` against an existing store.

- Shop: http://localhost:3000
- Staff: http://localhost:3000/admin
- Mock payments: `MPESA_MODE=mock`, accepted only outside production. No money moves.
- If SMTP is missing in development, verification codes are printed in the terminal.
- Development output uses `.next-dev`; production builds use `.next`.

Prisma generates into `node_modules/.prisma/wachira-client`. Generated clients and
native engine binaries are not source files and must not be committed. The old
`prisma/client` directory can remain locally while an existing process has it open.

## Authentication

Customer signup asks only for an email. We email a six-digit code, and the customer
enters their name and chooses their password (12–256 characters) on the same page where
they enter the code. The name and password are only ever set together with a valid code,
so nobody can pre-register someone else's email with a password they know, or put their
own text into the emails sent to it. "Forgot password" at `/forgot-password` uses the
same code-plus-new-password page. Signup, resend, forgot-password, login and the staff
sign-in form respond the same way whether or not an account (or staff address) exists.

Setting a new password signs out every existing session for that account: each
customer session carries the account's `sessionKey`, which changes on every password
set and is checked on each request. After-login `next=` redirects only accept paths on
this site.

Passwords use salted asynchronous scrypt; existing hashes remain valid. Codes expire
after ten minutes, allow five attempts, and are limited to one a minute and ten a day
per email (customers and staff), which caps guessing at 50 attempts a day. Staff sign
in with single-use six-digit codes. Sessions last fourteen days for customers and
seven days for staff.

Login and signup limits are stored in MongoDB so multiple server instances share the
same limits. Configure `AUTH_TRUSTED_IP_HEADER` only when your reverse proxy overwrites
that header with the verified client IP. Account limits always apply; IP limits apply
when that header is configured. Never trust a header supplied directly by the browser.

SMTP uses `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, and `MAIL_PASSWORD`.
`MAIL_ENCRYPTION=tls` requires STARTTLS (usually port 587); `ssl` uses TLS immediately
(usually port 465). `MAIL_FROM_ADDRESS` defaults to `MAIL_USERNAME`.

## Payments and emails

Prices and measurement requirements are checked on the server. Every payment retry
is claimed atomically and retains its own `PaymentAttempt`, so a delayed callback can
still identify an earlier prompt. Retries have a sixty-second cooldown. Old failure
callbacks cannot fail a newer prompt, and callbacks cannot downgrade paid or fulfilled
orders. Status polling checks pending attempts as a fallback for missing callbacks.

Payment status, its audit event, and outgoing email jobs are saved in one transaction.
Customer receipts and staff notifications have separate durable jobs. Delivery is
attempted after the response, and failed jobs use exponential backoff. SMTP delivery
is at-least-once: a crash after SMTP acceptance but before recording success may cause
a duplicate email.

For retries that must work even when nobody visits the store, schedule an authenticated
POST to `/api/jobs/order-mail` every minute, with:

```text
Authorization: Bearer <JOBS_SECRET>
```

Keep the secret in your scheduler's secret store. Each invocation processes up to 20
due jobs. Monitor unsent `OrderMailJob` records and server error logs. Configure an
appropriate request duration for the worker and the post-response tasks on your host.

Expired `AuthLimit` and `LoginCode` records should be removed periodically. You can
create a MongoDB TTL index on each collection's `expiresAt` field with
`expireAfterSeconds: 0` through your database administration workflow.

## Production deployment

1. Back up the existing MongoDB database and review the schema changes. Apply
   `pnpm db:push` in your deployment workflow before starting the new application.
   This release adds `PaymentAttempt`, `OrderMailJob`, and `AuthLimit` collections
   and indexes. It retains existing orders and their current callback references.
2. Set `APP_URL` to the public HTTPS origin and supply the production secrets, SMTP
   settings and staff addresses. Set `NEXT_PUBLIC_WHATSAPP` to your real number.
3. Remove `MPESA_MODE=mock`. Choose `MPESA_ENV=sandbox` for Daraja testing or
   `MPESA_ENV=production` for live payments. Supply the consumer key, consumer secret,
   shortcode and passkey. Production startup refuses missing required configuration
   or mock payments. Build-time generation does not require live payment credentials.
4. Paybill: `MPESA_TRANSACTION_TYPE=CustomerPayBillOnline`. Till:
   `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`, with the store number as
   `MPESA_SHORTCODE` and the till number as `MPESA_PARTY_B`.
5. Daraja callbacks go to `/api/mpesa/callback/<MPESA_CALLBACK_SECRET>`. Keep that URL
   secret and avoid recording it in public logs. Set up the email retry schedule.
6. Run the checks below, build with `pnpm build`, and start with `pnpm start`.
   The build may read product data while rendering static storefront pages.
7. Verify a sandbox payment, a delayed callback, a retry, and SMTP delivery against
   a staging database before accepting live orders.

An STK request can succeed remotely while the network response is lost. Such payments
still require operational reconciliation with Daraja; a database transaction cannot
make the external payment API atomic. Multiple paid attempts for one order should be
reviewed before fulfillment or refund handling.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm exec prisma validate
pnpm build
```

Regression tests use strict database substitutes and never connect to your database.
They cover signup credential preservation, one-time code use, throttling, payment
retry claims, late callbacks, callback validation, and durable email retries. They do
not replace MongoDB transaction, SMTP, or Daraja integration testing.

Business settings, delivery fees and lead times live in `src/lib/config.ts`.

## Product photos and samples

In **Admin → Products & samples**, add a product, upload its main and optional second
photo, and set its price, sizes and description. Check **Publish in shop and style
gallery** to make it visible. Every gallery photo links to its product's ordering page.
Existing sample photos without a product appear in **Sample photos ready to add**;
they remain unpublished until an admin supplies the ordering details.

Uploads accept JPEG, PNG and WebP files up to 5 MB and require an admin session.
Files are stored in `uploads/products`, or the directory set by `IMAGE_UPLOAD_DIR`.
Production hosting must provide a persistent writable disk shared by every app
instance; ephemeral/serverless filesystems need an object-storage integration instead.
Back up uploaded images alongside the database. Uploading a photo saves the file;
saving the product publishes the reference. Unused uploads are not deleted automatically.

Use **Admin → Orders** to review purchases, check the M-Pesa statement and confirm
payments, then update sewing, delivery or pickup progress.
