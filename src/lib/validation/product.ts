import { z } from "zod";

export const rankMetadataSchema = z.object({
  perks: z.array(z.string().min(1).max(200)).max(50).default([]),
  durationDays: z.coerce.number().int().min(0).max(3650).nullable().default(null), // null/0 = lifetime
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  kits: z.array(z.string().max(100)).max(20).default([]),
});

export const crateMetadataSchema = z.object({
  keys: z.coerce.number().int().min(1).max(1000).default(1),
  rewards: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).default("COMMON"),
        chance: z.coerce.number().min(0).max(100).optional(),
        quantity: z.coerce.number().int().min(1).max(10000).default(1),
      }),
    )
    .max(100)
    .default([]),
  contents: z.string().max(2000).default(""),
});

export const coinsMetadataSchema = z.object({
  amount: z.coerce.number().int().min(1).max(100_000_000),
  bonus: z.coerce.number().int().min(0).max(100_000_000).default(0),
});

export const customMetadataSchema = z.object({
  details: z.array(z.object({ label: z.string().max(60), value: z.string().max(300) })).max(30).default([]),
});

export const metadataSchemaByType = {
  RANK: rankMetadataSchema,
  CRATE: crateMetadataSchema,
  COINS: coinsMetadataSchema,
  CUSTOM: customMetadataSchema,
} as const;

export type RankMetadata = z.infer<typeof rankMetadataSchema>;
export type CrateMetadata = z.infer<typeof crateMetadataSchema>;
export type CoinsMetadata = z.infer<typeof coinsMetadataSchema>;
export type CustomMetadata = z.infer<typeof customMetadataSchema>;

const paise = z.coerce.number().int().min(0).max(100_000_000);

const productBase = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  categoryId: z.string().uuid().nullable().default(null),
  gameModeId: z.string().uuid().nullable().default(null),
  discountEligible: z.boolean().default(true),
  allowMultiple: z.boolean().default(false),
  shortDescription: z.string().max(300).default(""),
  description: z.string().max(20000).default(""),
  imageUrl: z.string().max(1000).nullable().default(null),
  gallery: z.array(z.string().max(1000)).max(12).default([]),
  regularPricePaise: paise.refine((v) => v >= 100, "Minimum price is ₹1"),
  salePricePaise: paise.nullable().default(null),
  javaAvailable: z.boolean().default(true),
  bedrockAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(-10000).max(10000).default(0),
});

/** Discriminated by type so metadata is validated with the right schema. */
export const productInputSchema = z
  .discriminatedUnion("type", [
    productBase.extend({ type: z.literal("RANK"), metadata: rankMetadataSchema }),
    productBase.extend({ type: z.literal("CRATE"), metadata: crateMetadataSchema }),
    productBase.extend({ type: z.literal("COINS"), metadata: coinsMetadataSchema }),
    productBase.extend({ type: z.literal("CUSTOM"), metadata: customMetadataSchema }),
  ])
  .superRefine((v, ctx) => {
    if (v.salePricePaise !== null && v.salePricePaise >= v.regularPricePaise) {
      ctx.addIssue({ code: "custom", path: ["salePricePaise"], message: "Sale price must be lower than the regular price" });
    }
    if (!v.javaAvailable && !v.bedrockAvailable) {
      ctx.addIssue({ code: "custom", path: ["javaAvailable"], message: "Enable at least one edition" });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export function parseMetadata(type: keyof typeof metadataSchemaByType, metadata: unknown) {
  const r = metadataSchemaByType[type].safeParse(metadata ?? {});
  return r.success ? r.data : metadataSchemaByType[type].parse(type === "COINS" ? { amount: 1 } : {});
}
