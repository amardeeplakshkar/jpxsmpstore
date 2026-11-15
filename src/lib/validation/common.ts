import { z } from "zod";

/** Java: 3-16 chars [A-Za-z0-9_]. Bedrock gamertags: 3-16 chars, letters/numbers/spaces, may be prefixed (e.g. "."). */
export const javaUsername = /^[A-Za-z0-9_]{3,16}$/;
export const bedrockUsername = /^[.*]?[A-Za-z0-9][A-Za-z0-9 _]{1,15}$/;

export const checkoutSchema = z
  .object({
    /** Cart checkout: up to 20 lines. `productSlug` is still accepted for single-item "Buy now". */
    items: z
      .array(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,140}$/), qty: z.coerce.number().int().min(1).max(10) }))
      .min(1)
      .max(20)
      .optional(),
    productSlug: z.string().min(1).max(140).optional(),
    purchaseType: z.enum(["SELF", "GIFT"]),
    gameEdition: z.enum(["JAVA", "BEDROCK"]),
    minecraftUsername: z.string().trim().min(3).max(17),
    giftNote: z.string().trim().max(200).optional().nullable(),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/, "Invalid idempotency key"),
  })
  .superRefine((v, ctx) => {
    if (!v.items?.length && !v.productSlug) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Your cart is empty." });
    }
    const re = v.gameEdition === "JAVA" ? javaUsername : bedrockUsername;
    if (!re.test(v.minecraftUsername)) {
      ctx.addIssue({
        code: "custom",
        path: ["minecraftUsername"],
        message:
          v.gameEdition === "JAVA"
            ? "Java usernames are 3-16 characters: letters, numbers and underscores."
            : "Enter a valid Bedrock gamertag (3-16 characters).",
      });
    }
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});
