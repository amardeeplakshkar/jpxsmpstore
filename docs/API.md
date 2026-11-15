# API reference

All JSON responses: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code", "message", "details?" } }`.
Status codes: 200/201 success, 401 not logged in, 403 forbidden/CSRF/blocked, 404 not found (also used for other users' orders), 409 conflict/invalid transition, 422 validation, 429 rate limited, 500/502/503.

Writes require a same-origin `Origin` header (CSRF protection) and are validated with Zod. Admin endpoints check permissions server-side on every call.

## Auth
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/auth/discord?returnTo=/checkout/vip` | Starts OAuth (state + PKCE in signed HTTP-only cookie) |
| GET | `/api/auth/discord/callback` | Validates state, syncs user, bootstraps admins, sets session |
| POST | `/api/auth/logout` | Destroys session |
| GET | `/api/auth/session` | Current user or `{ authenticated: false }` |

## Storefront (public)
| GET | `/api/store` | Branding, homepage, server, community, legal, announcements, server status |
| GET | `/api/categories` | Active categories |
| GET | `/api/products?type=RANK&category=slug&featured=true` | Active products |
| GET | `/api/products/[slug]` | Product detail |
| GET | `/api/server-status` | Cached Minecraft status (never throws) |
| GET | `/api/media/public/...` | Public media for the local storage driver |
| GET | `/api/health` | DB health check |

## Orders (logged-in customer, own orders only)
| GET | `/api/orders` | Order history |
| POST | `/api/orders` | `{ productSlug, purchaseType, gameEdition, minecraftUsername, giftNote?, idempotencyKey }` → `{ orderNumber, created }` |
| GET | `/api/orders/[orderNumber]` | Order, items, screenshots, timeline |
| GET | `/api/orders/[orderNumber]/payment` | UPI ID, amount, intent URI, QR data URL, status, expiry |
| POST | `/api/orders/[orderNumber]/screenshot` | multipart `file` (+ optional `transactionRef`) → VERIFYING |
| GET | `/api/orders/[orderNumber]/screenshot/[id]` | Private image (owner or admin) |

## Admin
| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | dashboard.view |
| GET, POST | `/api/admin/products` | products.manage |
| GET, PUT, PATCH, DELETE | `/api/admin/products/[id]` | products.manage (PATCH = quick toggles) |
| POST | `/api/admin/products/[id]/duplicate` | products.manage |
| POST | `/api/admin/products/reorder` `{ ids }` | products.manage |
| GET, POST | `/api/admin/categories`; PATCH, DELETE `/[id]` | categories.manage |
| GET | `/api/admin/orders?q&discord&mc&product&from&to&purchaseType&edition&payment&fulfillment&page` | orders.view |
| GET, PATCH | `/api/admin/orders/[id]` | PATCH `{ action }`: confirm_payment, reject_payment, request_evidence (payments.verify) · start_fulfillment, mark_fulfilled, mark_failed (fulfillment.manage) · cancel (orders.cancel) · refund (payments.refund) · add_note (orders.note) |
| GET | `/api/admin/payments?status&q&page` | payments.view |
| POST | `/api/admin/payments/poll` | payments.verify |
| PATCH | `/api/admin/payments/emails/[id]` `{ action: "link", orderNumber }` or `{ action: "ignore", reason }` | payments.verify |
| PATCH | `/api/admin/payments/screenshots/[id]` `{ decision: "APPROVE", transactionRef? }` or `{ decision: "REJECT", reason }` | payments.verify |
| GET | `/api/admin/users?q&status&page`; GET, PATCH `/[id]` `{ action: block/unblock }` | users.view / users.block |
| GET, POST | `/api/admin/admins`; PATCH `/[id]` | admins.manage |
| GET | `/api/admin/fulfillment?status=FULFILLED` | fulfillment.manage |
| GET, PUT | `/api/admin/settings` `{ section, value }` | storefront.manage; payment/imap need settings.payment |
| POST | `/api/admin/settings/test-imap` | settings.payment |
| GET, POST | `/api/admin/media`; DELETE `/[id]` | media.manage |
| GET, POST | `/api/admin/announcements`; PATCH, DELETE `/[id]` | storefront.manage |
| GET | `/api/admin/audit-logs?action&entity&page` | audit.view |

Role matrix lives in `src/lib/permissions/index.ts`.


## Added endpoints
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/cart/quote` | `{ items: [{ slug, qty }] }` returns priced lines, subtotal, discount, total, unavailable items and which editions every item supports |
| POST | `/api/orders` | now accepts `items: [{ slug, qty }]` (1-20 lines); `productSlug` still works for single-item orders |
| GET, POST | `/api/admin/game-modes`; PATCH, DELETE `/[id]` | categories.manage. Changing a mode's types is blocked while it still has products of a removed type |
| PUT | `/api/admin/settings` | new sections `discount` and `social` |
