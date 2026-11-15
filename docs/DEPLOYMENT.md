# Deployment, admin setup and payment worker setup

## 1. Discord application
1. https://discord.com/developers/applications → New Application.
2. OAuth2 → copy **Client ID** and **Client Secret**.
3. OAuth2 → Redirects → add `https://YOUR_DOMAIN/api/auth/discord/callback` (must match `DISCORD_REDIRECT_URI` exactly).
Only the `identify` scope is used.

## 2. VPS deployment (Docker Compose)
Requirements: Docker + Compose plugin, a domain pointing at the VPS, ~2 GB RAM (the Next.js build is memory hungry).

```bash
git clone <repo> jpxmc && cd jpxmc     # or upload and unzip the files
cp .env.example .env && nano .env      # fill in every value
docker compose up -d --build
docker compose logs -f migrate web worker
```
Services: `postgres`, `redis`, `migrate` (runs migrations + seed, then exits), `web` (port 3000 on 127.0.0.1), `worker`.

### HTTPS reverse proxy (Caddy example)
```
jpxsmpstore.vercel.app {
  reverse_proxy 127.0.0.1:3000
}
```
Nginx works too; forward `X-Forwarded-For` and `Host`. Cookies are `Secure` in production, so HTTPS is required.

### Updating
```bash
git pull && docker compose up -d --build   # migrate runs again automatically
```

### Backups
`docker compose exec postgres pg_dump -U jpxmc jpxmc > backup.sql` (schedule with cron). Also back up the `storage` volume if you use `STORAGE_DRIVER=local`.

## 3. Admin setup
1. Put your Discord user ID in `ADMIN_DISCORD_IDS` (comma-separated). Get it from Discord: Settings → Advanced → Developer Mode, then right-click your name → Copy User ID.
2. Log in on the store. You are created as **SUPER_ADMIN** and the action is audit-logged.
3. Go to `/admin/dashboard`.
4. **Settings → UPI payments:** UPI ID, payee name, instructions, expiry. Checkout stays disabled until a UPI ID is set and QR payments are enabled.
5. **Storefront:** name, logo, hero, server IP, Discord invite, announcements, footer, terms and privacy.
6. **Categories / Products:** add the real JPXMC catalog. The seed deliberately creates no products or prices.
7. **Settings → Admin roles:** add staff by Discord ID as ADMIN or SUPPORT. Removing someone from `ADMIN_DISCORD_IDS` does not revoke access; revoke in the admin panel.

## 4. Payment worker (IMAP) setup
The worker polls a mailbox that receives your bank's or UPI app's **credit alert** emails.

1. Use a dedicated mailbox, or forward bank alerts to one. For Gmail, enable IMAP and create an **App Password** (requires 2FA). Host `imap.gmail.com`, port 993, TLS on.
2. Admin → Settings → Email verification (IMAP): enter host, port, username, password, mailbox (e.g. `INBOX`), polling interval.
3. Add **trusted senders**, one per line: the exact address your bank uses (e.g. `alerts@hdfcbank.net`) or a domain (`@hdfcbank.net`). Emails from any other sender are recorded as UNTRUSTED and never used. Emails whose `Authentication-Results` show a DKIM/SPF/DMARC failure are also rejected.
4. Click **Test connection**, then enable and save.
5. Check Admin → Payments: worker status should show Online with a recent poll.

### How matching works
- Parsers (`worker/src/parsers`) handle HDFC, ICICI, SBI, Axis, Kotak, Paytm, PhonePe and GPay Business senders, plus a generic UPI-credit fallback. Debit alerts are ignored. To add a provider, add a parser to the `PARSERS` list.
- **High confidence:** the email contains the order number (customers' UPI note is pre-filled with it), the exact amount, a UTR, and a time inside the payment window ± tolerance. If "auto-confirm" is on, the order becomes PAID and enters the fulfillment queue.
- **Medium confidence:** exactly one open order has that exact amount. The order becomes MATCHED and waits for an admin to confirm.
- **AMBIGUOUS / UNMATCHED / DUPLICATE / PARSE_FAILED / UNTRUSTED** results are logged in Admin → Payments for manual linking or ignoring. Nothing is ever confirmed on a guess.
- Idempotency: Message-ID is unique, UTR is unique, the order row is locked during updates, and failed polls retry with exponential backoff.
- The last processed IMAP UID is kept in Redis, so the worker never re-reads old mail; the first run looks back 2 days.
- Unpaid PENDING orders expire automatically (every minute). Orders with a screenshot (VERIFYING) wait for an admin.

### Screenshot fallback
Customers can upload PNG/JPG/WebP proof (size and count limits in Settings). Files are validated by magic bytes and stored privately. Approving a screenshot in the order page or Payments page is the only way it leads to PAID.

## 5. Storage
- `STORAGE_DRIVER=local` (default): files go to the `storage` Docker volume. Public images are served from `/api/media/public/...`; screenshots are never publicly reachable.
- `STORAGE_DRIVER=cloudinary`: set `CLOUDINARY_*`. Public images use normal delivery; screenshots use `authenticated` assets streamed through the app.

## 6. Testing
`npm test` runs parser, matching, validation, money, UPI and permission tests against mock bank-email fixtures (`tests/fixtures/emails.ts`). No real transfers are needed. Before going live, do one real end-to-end run: create a ₹1 test product, buy it, pay it, confirm the worker matches it, fulfil it, then deactivate the product.
