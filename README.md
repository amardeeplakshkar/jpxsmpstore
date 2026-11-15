# JPXMC Webstore

Full-stack Minecraft webstore for JPXMC: Discord login, self/gift checkout for Java and Bedrock, dynamic UPI QR payments, IMAP bank-email verification, screenshot fallback, manual fulfillment and a complete admin dashboard.

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, ShadCN-style UI (Radix), Lucide, Recharts, Zod, PostgreSQL + Drizzle ORM, Redis + BullMQ, ImapFlow, qrcode, Docker Compose.

## Quick start (local development)

```bash
cp .env.example .env            # fill in values (see below)
docker compose up -d postgres redis
npm install
npm run db:migrate              # applies src/db/migrations
npm run db:seed                 # default settings + starter categories (no products)
npm run dev                     # http://localhost:3000
npm run worker                  # payment worker, in a second terminal
```

Local `.env` values: `DATABASE_URL=postgres://jpxmc:change-me@localhost:5432/jpxmc`, `REDIS_URL=redis://localhost:6379`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback`, `LOCAL_STORAGE_DIR=./storage`.

Generate secrets with `openssl rand -hex 32` (for both `SESSION_SECRET` and `ENCRYPTION_KEY`).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | IMAP payment worker (BullMQ) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit/integration tests with mock bank-email fixtures |
| `npm run db:generate` | Generate a migration after editing `src/db/schema` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed settings and starter categories |

## Project structure

```
src/
  app/(store)/        storefront: home, ranks, crates, coins, shop, product/[slug], checkout/[slug], orders, account, terms, privacy
  app/admin/          dashboard, products, categories, orders, payments, users, fulfillment, media, storefront, settings, audit-logs
  app/api/            route handlers (see docs/API.md)
  components/ui       design system (button, input, select, dialog, dropdown, tabs, table, card, badge, tooltip, toast, skeleton, empty state, confirm dialog)
  components/{store,products,checkout,payments,admin}
  db/schema, db/migrations
  lib/{auth,discord,payments,permissions,validation,storage,settings,orders,admin}
worker/src/{imap,parsers,matching,jobs}
tests/                 node:test suites + email fixtures
docs/                  database, API, deployment, admin and worker guides
```

Imports are root-based with no `@`/`~` aliases: `tsconfig.json` sets `baseUrl: "src"`, so you write `import { Button } from "components/ui/button"`.

## Key design decisions

- **Money is integer paise** everywhere. Prices are computed on the server from the database; the client only sends a product slug.
- **Orders snapshot** product name, type, image, metadata and prices into `order_items.product_snapshot`.
- **Idempotent checkout:** unique `(user_id, idempotency_key)`; the browser keeps one key per checkout attempt.
- **Payment and fulfillment statuses are separate fields** with enforced transitions and full history in `order_status_history`.
- **A payment is only PAID when** (a) the worker sees a trusted bank email with the order ID, exact amount, a transaction reference and a valid time (if auto-confirm is on), or (b) an authorised admin confirms it. Scanning the QR or uploading a screenshot never marks an order paid.
- **UTR reuse is impossible:** `payments.transaction_ref` is unique.
- **Secrets:** IMAP password is AES-256-GCM encrypted in the DB and never returned by any API. Discord access tokens are used once and never stored. Sessions store only an HMAC of the cookie token.
- **Screenshots are private:** stored outside `public/` (or as Cloudinary `authenticated` assets) and streamed only to the owner or admins.

## Not included in this MVP

- Automatic in-game delivery (RCON/plugin). `fulfillments.method` already supports `RCON`/`PLUGIN` for later.
- Coupon codes (the discount shown is regular price minus sale price).
- S3 storage driver (Cloudinary and a private local volume are implemented behind `lib/storage`).

See `docs/` for the database schema, API reference, deployment, admin setup and payment worker setup.
