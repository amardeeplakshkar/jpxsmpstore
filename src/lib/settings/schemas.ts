import { z } from "zod";

const optionalUrl = z.union([z.string().url(), z.literal("")]).default("");

export const brandingSchema = z.object({
  storeName: z.string().min(1).max(60).default("JPXMC Store"),
  logoUrl: optionalUrl,
  tagline: z.string().max(160).default("The official JPXMC webstore"),
});

export const homepageSchema = z.object({
  heroTitle: z.string().max(120).default("Level up your JPXMC adventure"),
  heroDescription: z.string().max(500).default("Ranks, crates and coins for Java and Bedrock players."),
  heroBannerUrl: optionalUrl,
  introTitle: z.string().max(120).default("Welcome to JPXMC"),
  introBody: z.string().max(4000).default(""),
  howToPurchase: z
    .array(z.object({ title: z.string().max(80), body: z.string().max(300) }))
    .max(8)
    .default([
      { title: "Pick a product", body: "Browse ranks, crates and coins and choose what you want." },
      { title: "Log in with Discord", body: "We use Discord to identify you securely. No passwords." },
      { title: "Pay with UPI", body: "Scan the QR code or tap to pay from any UPI app." },
      { title: "Get it in-game", body: "Our team verifies your payment and delivers your purchase." },
    ]),
});

export const serverSchema = z.object({
  javaAddress: z.string().max(120).default(""),
  bedrockAddress: z.string().max(120).default(""),
  bedrockPort: z.coerce.number().int().min(1).max(65535).default(19132),
  statusEnabled: z.boolean().default(true),
  serverInfo: z.string().max(2000).default(""),
  supportedVersions: z.string().max(120).default(""),
});

export const communitySchema = z.object({
  discordInviteUrl: optionalUrl,
  footerText: z.string().max(500).default("JPXMC is not affiliated with Mojang Studios or Microsoft."),
  footerLinks: z.array(z.object({ label: z.string().max(40), url: z.string().max(300) })).max(10).default([]),
});

export const legalSchema = z.object({
  termsUrl: optionalUrl,
  privacyUrl: optionalUrl,
  termsContent: z.string().max(50000).default(""),
  privacyContent: z.string().max(50000).default(""),
});

export const paymentSchema = z.object({
  upiId: z
    .string()
    .max(120)
    .regex(/^$|^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID like name@bank")
    .default(""),
  payeeName: z.string().max(60).default("JPXMC"),
  instructions: z
    .string()
    .max(2000)
    .default("Pay the exact amount shown. Do not change the payment note. Your order will be verified automatically or by our team."),
  qrEnabled: z.boolean().default(true),
  expiryMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  screenshotEnabled: z.boolean().default(true),
  maxScreenshotsPerOrder: z.coerce.number().int().min(1).max(10).default(3),
  maxScreenshotSizeMb: z.coerce.number().int().min(1).max(15).default(5),
  autoConfirmHighConfidence: z.boolean().default(true),
  paymentTimeToleranceMinutes: z.coerce.number().int().min(0).max(1440).default(15),
});

export const imapPublicSchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().max(200).default(""),
  port: z.coerce.number().int().min(1).max(65535).default(993),
  secure: z.boolean().default(true),
  username: z.string().max(200).default(""),
  mailbox: z.string().max(120).default("INBOX"),
  pollingIntervalSeconds: z.coerce.number().int().min(15).max(3600).default(60),
  trustedSenders: z.array(z.string().max(200)).max(50).default(["noreply@slice.bank.in"]),
});

/** Stored form includes the encrypted password. Never returned by any API. */
export const imapStoredSchema = imapPublicSchema.extend({
  passwordEncrypted: z.string().default(""),
});

export const SETTINGS = {
  branding: brandingSchema,
  homepage: homepageSchema,
  server: serverSchema,
  community: communitySchema,
  legal: legalSchema,
  payment: paymentSchema,
  imap: imapStoredSchema,
} as const;

export type SettingsKey = keyof typeof SETTINGS;
export type SettingsValue<K extends SettingsKey> = z.infer<(typeof SETTINGS)[K]>;
export type ImapPublic = z.infer<typeof imapPublicSchema> & { passwordSet: boolean };
