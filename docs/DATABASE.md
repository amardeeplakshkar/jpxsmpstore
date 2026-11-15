# Database schema

PostgreSQL via Drizzle ORM. Source: `src/db/schema/`. Migration: `src/db/migrations/0000_init.sql`. All money columns are **integer paise**. All timestamps are `timestamptz`.

## Enums
`account_status` (ACTIVE, BLOCKED) · `admin_role` (SUPER_ADMIN, ADMIN, SUPPORT) · `product_type` (RANK, CRATE, COINS, CUSTOM) · `purchase_type` (SELF, GIFT) · `game_edition` (JAVA, BEDROCK) · `payment_status` (PENDING, VERIFYING, MATCHED, PAID, REJECTED, EXPIRED, REFUNDED) · `fulfillment_status` (PENDING, PROCESSING, FULFILLED, FAILED, CANCELLED) · `payment_method` (UPI_EMAIL, UPI_SCREENSHOT, MANUAL) · `payment_email_status` (MATCHED, UNMATCHED, AMBIGUOUS, DUPLICATE, UNTRUSTED, PARSE_FAILED, IGNORED) · `screenshot_status` · `history_kind` · `actor_type` · `fulfillment_method` (MANUAL, RCON, PLUGIN) · `announcement_type`.

## Tables

| Table | Purpose | Key constraints |
| --- | --- | --- |
| `users` | Discord users (everyone who logs in) | `discord_id` UNIQUE |
| `sessions` | Server-side sessions; id = HMAC(cookie token) | FK users ON DELETE CASCADE |
| `admin_users` | Admin roles by Discord ID (can exist before first login) | `discord_id` UNIQUE, FK users SET NULL |
| `categories` | Product groups, soft delete | `slug` UNIQUE |
| `products` | Catalog; type-specific data in `metadata` JSONB validated by Zod | `slug` UNIQUE, FK categories SET NULL, soft delete |
| `product_images` | Gallery images | FK products CASCADE |
| `media_assets` | Media library (public images) | soft delete |
| `orders` | One purchase; separate `payment_status` and `fulfillment_status` | `order_number` UNIQUE, (`user_id`,`idempotency_key`) UNIQUE, FK users RESTRICT |
| `order_items` | Price + product **snapshot** | FK orders CASCADE, FK products SET NULL |
| `payments` | UPI request + verification evidence (1 per order) | `order_id` UNIQUE, `transaction_ref` UNIQUE (NULLs allowed) |
| `payment_emails` | Every processed IMAP email with parse + match result | `message_id` UNIQUE |
| `payment_screenshots` | Private screenshot uploads + review | FK orders CASCADE |
| `fulfillments` | Delivery record: username, edition, product, admin Discord ID, time, notes, proof | `order_id` UNIQUE |
| `order_status_history` | Every status change, event and internal note | FK orders CASCADE |
| `store_settings` | Key/value JSONB settings (branding, homepage, server, community, legal, payment, imap) | PK key |
| `announcements` | Homepage announcements with schedule, soft delete | |
| `audit_logs` | Append-only audit trail | indexes on time, entity, actor |

## Relationships
`users 1─* orders 1─* order_items`, `orders 1─1 payments`, `orders 1─1 fulfillments`, `orders 1─* payment_screenshots`, `orders 1─* order_status_history`, `orders 1─* payment_emails (matched)`, `categories 1─* products 1─* product_images`.

## Delete policies
Orders and payments use RESTRICT so financial records can't be lost by deleting a user or order. Products and categories are soft-deleted (`deleted_at`) and their slug is renamed so it can be reused; order snapshots stay intact.

## Payment status transitions
```
PENDING   → VERIFYING, MATCHED, PAID, REJECTED, EXPIRED
VERIFYING → PENDING, MATCHED, PAID, REJECTED, EXPIRED
MATCHED   → PAID, REJECTED, VERIFYING
REJECTED  → VERIFYING, PAID
EXPIRED   → VERIFYING, MATCHED, PAID   (late payment found)
PAID      → REFUNDED
```
Fulfillment: `PENDING → PROCESSING/FULFILLED/FAILED/CANCELLED`, `PROCESSING → FULFILLED/FAILED/CANCELLED/PENDING`, `FAILED → PROCESSING/CANCELLED`. Fulfillment requires payment PAID.

## Changing the schema
Edit `src/db/schema/*.ts`, run `npm run db:generate -- --name <change>`, commit the SQL, deploy (the `migrate` service applies it).
