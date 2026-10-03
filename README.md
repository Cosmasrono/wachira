# Wachira

Online clothing store for Wachira. Customers order in a standard size or send their own
measurements, pay with M-Pesa (STK push), and track the order. Staff manage orders and
products at `/admin`.

Built with Next.js 15 (App Router), Prisma and Zod.

## Run it locally

```bash
npm install
npm run db:push     # creates prisma/dev.db
npm run db:seed     # adds the 16 sample products
npm run dev
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin (sign in with an emailed code; see **Sign-in** below)

Development writes generated files to `.next-dev`; production builds and `npm start`
use `.next`, so a build cannot overwrite a running development server's chunks.

Payments run in **mock mode** locally (`MPESA_MODE="mock"`): an order is marked paid about
4 seconds after checkout, and no money moves.

## How ordering works

1. The customer picks a product, then **Standard size** or **My measurements**.
   Made-to-measure adds `CUSTOM_FEE` and takes `CUSTOM_LEAD_TIME` (both in `src/lib/config.ts`).
2. Checkout asks for name, phone, delivery option and address.
3. The server prices the order from the database (browser prices are never trusted), saves it
   as **Awaiting payment**, and sends an M-Pesa prompt to the customer's phone.
4. The order page waits for the result. Safaricom calls
   `/api/mpesa/callback/<MPESA_CALLBACK_SECRET>`. As a backup, the page asks Daraja for the
   status every 15 seconds. If payment fails or times out, the customer can resend the prompt.
5. Staff move the order along in the admin panel:
   Paid → Sewing (made-to-measure only) → Dispatched / Ready for pick up → Delivered.

## Project layout

```
prisma/
  schema.prisma        Product, Order, OrderItem, OrderEvent
  seed.ts              Sample products
public/products/       Product photos (see README.txt in that folder)
src/
  middleware.ts        Protects /admin
  lib/
    config.ts          Categories, delivery fees, custom fee, lead time  <- business settings
    pricing.ts         Server-side pricing and measurement checks
    mpesa.ts           Daraja STK push + status query
    orders.ts          Order numbers, payment requests, paid/failed updates
    order-status.ts    Status names and the order flow
    validation.ts      Zod schemas for checkout and the product form
  components/          Cart, product card, add-to-bag, checkout, payment watcher
  app/
    (store)/           Home, shop, product, checkout, order tracking
    admin/             Login, orders, products
    api/orders/        Create order, poll status, retry payment
    api/mpesa/         M-Pesa callback
```

## Going live

### M-Pesa (Daraja)
1. Create an app at https://developer.safaricom.co.ke and test with the sandbox
   (shortcode `174379` and the sandbox passkey from the Daraja portal).
2. The callback needs a public HTTPS URL. For local testing run `ngrok http 3000` and set
   `APP_URL` to the ngrok URL.
3. For real payments, apply for **Lipa na M-Pesa Online** on your Paybill or Till, then set
   `MPESA_ENV="production"`, your keys, shortcode and passkey, and **remove `MPESA_MODE="mock"`**.
   - Paybill: `MPESA_TRANSACTION_TYPE="CustomerPayBillOnline"`, leave `MPESA_PARTY_B` empty.
   - Till: `MPESA_TRANSACTION_TYPE="CustomerBuyGoodsOnline"`, `MPESA_SHORTCODE` = store number,
     `MPESA_PARTY_B` = till number.

### Sign-in (emailed code)
Shoppers sign in at `/account` and staff at `/admin` by entering their email and typing back the
6-digit code we send. There are no passwords. The first sign-in with an address creates the shopper's
account. Staff codes are only sent to addresses listed in `ADMIN_EMAILS`.

1. Fill in the `MAIL_*` values in `.env`. For Gmail use `MAIL_HOST="smtp.gmail.com"`, `MAIL_PORT=587`,
   `MAIL_ENCRYPTION="tls"`, and an **app password** (Google Account > Security > App passwords),
   not the normal Gmail password.
2. Set `AUTH_SECRET` to a long random string (32+ characters). It signs the sign-in cookies and the codes.
3. Set `ADMIN_EMAILS="you@example.com,staff@example.com"`.

Locally, if the `MAIL_*` values are missing, the code is printed in the `npm run dev` terminal instead.

A code works for 10 minutes and allows 5 wrong tries; a new code can be sent after a minute
(`src/lib/login-code.ts`). The server then issues its own signed cookie (`src/lib/session.ts`).

To remove a staff member, take them off `ADMIN_EMAILS`; that takes effect at once. Sessions last
14 days for shoppers and 7 for staff (both set in `src/lib/session.ts`). Changing `AUTH_SECRET`
signs everyone out immediately.

### Database
SQLite is for local use only. For hosting (e.g. Vercel), create a PostgreSQL database
(Neon or Supabase both have free tiers), set `provider = "postgresql"` in
`prisma/schema.prisma`, set `DATABASE_URL`, then run `npm run db:push` and `npm run db:seed`.

### Before launch
- Set `ADMIN_EMAILS` to your staff, and new random values for `AUTH_SECRET` and `MPESA_CALLBACK_SECRET`.
- Set `NEXT_PUBLIC_WHATSAPP` to your real number (2547XXXXXXXX).
- Check the fees and lead time in `src/lib/config.ts`.
- Add product photos to `public/products/`.

## Ideas for later
- Image upload in the admin (Cloudinary or UploadThing) instead of copying files.
- SMS to the customer when the status changes (Africa's Talking).
- Saved measurements per customer, so repeat orders are faster.
- Stock counts for standard sizes.
