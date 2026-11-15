import { pgEnum } from "drizzle-orm/pg-core";

export const accountStatus = pgEnum("account_status", ["ACTIVE", "BLOCKED"]);
export const adminRole = pgEnum("admin_role", ["SUPER_ADMIN", "ADMIN", "SUPPORT"]);
export const productType = pgEnum("product_type", ["RANK", "CRATE", "COINS", "CUSTOM"]);
export const purchaseType = pgEnum("purchase_type", ["SELF", "GIFT"]);
export const gameEdition = pgEnum("game_edition", ["JAVA", "BEDROCK"]);
export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "VERIFYING",
  "MATCHED",
  "PAID",
  "REJECTED",
  "EXPIRED",
  "REFUNDED",
]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "PENDING",
  "PROCESSING",
  "FULFILLED",
  "FAILED",
  "CANCELLED",
]);
export const paymentMethod = pgEnum("payment_method", ["UPI_EMAIL", "UPI_SCREENSHOT", "MANUAL"]);
export const paymentEmailStatus = pgEnum("payment_email_status", [
  "MATCHED",
  "UNMATCHED",
  "AMBIGUOUS",
  "DUPLICATE",
  "UNTRUSTED",
  "PARSE_FAILED",
  "IGNORED",
]);
export const screenshotStatus = pgEnum("screenshot_status", ["PENDING", "APPROVED", "REJECTED"]);
export const historyKind = pgEnum("history_kind", ["PAYMENT", "FULFILLMENT", "NOTE", "EVENT"]);
export const actorType = pgEnum("actor_type", ["SYSTEM", "USER", "ADMIN", "WORKER"]);
export const fulfillmentMethod = pgEnum("fulfillment_method", ["MANUAL", "RCON", "PLUGIN"]);
export const announcementType = pgEnum("announcement_type", ["INFO", "SALE", "UPDATE", "WARNING"]);

export const PAYMENT_STATUSES = paymentStatus.enumValues;
export const FULFILLMENT_STATUSES = fulfillmentStatus.enumValues;
export const PRODUCT_TYPES = productType.enumValues;
export const ADMIN_ROLES = adminRole.enumValues;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];
