import { z } from "zod";
import { ApiError, ok, parseJson, route } from "lib/api";
import { audit } from "lib/audit";
import { requireAdminApi } from "lib/auth/guards";
import { encryptSecret } from "lib/crypto";
import { hasPermission } from "lib/permissions";
import { getPublicImap, getSetting, getStorefrontSettings, saveSetting } from "lib/settings";
import { brandingSchema, communitySchema, discountSchema, socialSchema, homepageSchema, imapPublicSchema, legalSchema, paymentSchema, serverSchema } from "lib/settings/schemas";

/** Returns settings. IMAP password is never returned, only whether it is set. */
export const GET = route(async () => {
  const admin = await requireAdminApi("storefront.manage");
  const storefront = await getStorefrontSettings();
  const canPayment = hasPermission(admin.adminRole, "settings.payment");
  return ok({
    ...storefront,
    payment: canPayment ? await getSetting("payment") : null,
    imap: canPayment ? await getPublicImap() : null,
  });
});

const updateSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("branding"), value: brandingSchema }),
  z.object({ section: z.literal("homepage"), value: homepageSchema }),
  z.object({ section: z.literal("server"), value: serverSchema }),
  z.object({ section: z.literal("community"), value: communitySchema }),
  z.object({ section: z.literal("legal"), value: legalSchema }),
  z.object({ section: z.literal("discount"), value: discountSchema }),
  z.object({ section: z.literal("social"), value: socialSchema }),
  z.object({ section: z.literal("payment"), value: paymentSchema }),
  z.object({ section: z.literal("imap"), value: imapPublicSchema.extend({ password: z.string().max(500).optional(), clearPassword: z.boolean().optional() }) }),
]);

export const PUT = route(async (req) => {
  const input = await parseJson(req, updateSchema);
  const needsPayment = input.section === "payment" || input.section === "imap";
  const admin = await requireAdminApi(needsPayment ? "settings.payment" : "storefront.manage");

  if (input.section === "imap") {
    const current = await getSetting("imap");
    const { password, clearPassword, ...rest } = input.value;
    const passwordEncrypted = clearPassword ? "" : password ? encryptSecret(password) : current.passwordEncrypted;
    if (rest.enabled && (!rest.host || !rest.username || !passwordEncrypted)) {
      throw new ApiError(422, "IMAP_INCOMPLETE", "Host, username and password are required to enable IMAP.");
    }
    if (rest.enabled && rest.trustedSenders.length === 0) {
      throw new ApiError(422, "NO_TRUSTED_SENDERS", "Add at least one trusted sender before enabling IMAP verification.");
    }
    await saveSetting("imap", { ...rest, passwordEncrypted }, admin.id);
    await audit({ actor: admin, action: "settings.update", entityType: "settings", entityId: "imap", metadata: { ...rest, passwordChanged: Boolean(password) || Boolean(clearPassword) }, req });
    return ok(await getPublicImap());
  }

  await saveSetting(input.section, input.value as never, admin.id);
  await audit({ actor: admin, action: "settings.update", entityType: "settings", entityId: input.section, metadata: input.value as Record<string, unknown>, req });
  return ok({ saved: input.section });
});
