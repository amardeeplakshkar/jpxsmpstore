import { z } from "zod";

export const PRODUCT_TYPES = ["RANK", "CRATE", "COINS", "CUSTOM"] as const;

/** Accepts allowedTypes directly or the four admin switches (sellsRanks etc.) from the dialog form. */
export const gameModeSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: z
      .string()
      .trim()
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
    description: z.string().max(500).default(""),
    iconUrl: z.string().max(1000).nullable().default(null),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #a855f7").default("#a855f7"),
    allowedTypes: z.array(z.enum(PRODUCT_TYPES)).optional(),
    sellsRanks: z.boolean().optional(),
    sellsCrates: z.boolean().optional(),
    sellsCoins: z.boolean().optional(),
    sellsCustom: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
    isActive: z.boolean().default(true),
  })
  .transform(({ sellsRanks, sellsCrates, sellsCoins, sellsCustom, allowedTypes, iconUrl, ...rest }) => {
    const fromSwitches = [sellsRanks && "RANK", sellsCrates && "CRATE", sellsCoins && "COINS", sellsCustom && "CUSTOM"].filter(Boolean) as string[];
    const types = allowedTypes ?? fromSwitches;
    return { ...rest, iconUrl: iconUrl || null, allowedTypes: types.length ? types : ["RANK"] };
  });

/** Reserved first path segments so a mode slug can never shadow a real store page. */
export const RESERVED_MODE_SLUGS = new Set([
  "account", "admin", "api", "checkout", "coins", "crates", "orders", "privacy", "product", "ranks", "shop", "terms", "cart", "login", "logout", "_next", "static",
]);
