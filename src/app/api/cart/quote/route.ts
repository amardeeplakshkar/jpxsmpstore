import { z } from "zod";
import { ApiError, clientIp, ok, parseJson, route } from "lib/api";
import { MAX_CART_LINES, MAX_QTY } from "lib/cart";
import { publicQuote, quoteCart } from "lib/orders/quote";
import { rateLimit } from "lib/rate-limit";

const schema = z.object({
  items: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,140}$/), qty: z.coerce.number().int().min(1).max(MAX_QTY) })).max(MAX_CART_LINES),
});

/** Public: prices a cart from the database. Used by the cart drawer. */
export const POST = route(async (req) => {
  await rateLimit("cart-quote", clientIp(req), 120, 60);
  const { items } = await parseJson(req, schema);
  try {
    return ok(publicQuote(await quoteCart(items)));
  } catch (err) {
    const code = ((err as { cause?: { code?: string } })?.cause ?? (err as { code?: string }))?.code;
    if (code === "42703" || code === "42P01") {
      // Undefined column/table: the code is newer than the database schema.
      console.error("[cart] database schema is behind the code. Run `pnpm db:migrate`.", err);
      throw new ApiError(503, "MIGRATION_PENDING", "The store is being updated. Please try again in a minute.");
    }
    throw err;
  }
});
