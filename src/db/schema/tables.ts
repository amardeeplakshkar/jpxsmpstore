import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";
import {
  accountStatus,
  actorType,
  adminRole,
  announcementType,
  fulfillmentMethod,
  fulfillmentStatus,
  gameEdition,
  historyKind,
  paymentEmailStatus,
  paymentMethod,
  paymentStatus,
  productType,
  purchaseType,
  screenshotStatus,
} from "db/schema/enums";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").defaultNow().notNull();
const updatedAt = () => ts("updated_at").defaultNow().notNull().$onUpdate(() => new Date());

/* ------------------------------------------------------------------ users */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discordId: varchar("discord_id", { length: 32 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    globalName: varchar("global_name", { length: 64 }),
    avatar: varchar("avatar", { length: 128 }),
    status: accountStatus("status").default("ACTIVE").notNull(),
    blockedReason: text("blocked_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastLoginAt: ts("last_login_at"),
  },
  (t) => [uniqueIndex("users_discord_id_uq").on(t.discordId), index("users_username_idx").on(t.username)],
);

/* --------------------------------------------------------------- sessions */
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 128 }).primaryKey(), // HMAC-SHA256 of the cookie token, never the raw token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").defaultNow().notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/* ------------------------------------------------------------ admin_users */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discordId: varchar("discord_id", { length: 32 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    role: adminRole("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_users_discord_id_uq").on(t.discordId), index("admin_users_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------- categories */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    productType: productType("product_type"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug), index("categories_sort_idx").on(t.sortOrder)],
);

/* ------------------------------------------------------------- game_modes */
export const gameModes = pgTable(
  "game_modes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    slug: varchar("slug", { length: 60 }).notNull(),
    description: text("description").default("").notNull(),
    iconUrl: text("icon_url"),
    accentColor: varchar("accent_color", { length: 7 }).default("#a855f7").notNull(),
    allowedTypes: jsonb("allowed_types").$type<string[]>().default(["RANK", "CRATE", "COINS", "CUSTOM"]).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("game_modes_slug_uq").on(t.slug), index("game_modes_sort_idx").on(t.sortOrder)],
);

/* --------------------------------------------------------------- products */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    gameModeId: uuid("game_mode_id").references(() => gameModes.id, { onDelete: "set null" }),
    type: productType("type").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    shortDescription: text("short_description").default("").notNull(),
    description: text("description").default("").notNull(),
    imageUrl: text("image_url"),
    regularPricePaise: integer("regular_price_paise").notNull(),
    salePricePaise: integer("sale_price_paise"),
    discountEligible: boolean("discount_eligible").default(true).notNull(),
    /** Lets players buy more than one in a single order. Crates always can; ranks never can. */
    allowMultiple: boolean("allow_multiple").default(false).notNull(),
    javaAvailable: boolean("java_available").default(true).notNull(),
    bedrockAvailable: boolean("bedrock_available").default(true).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_type_idx").on(t.type),
    index("products_category_idx").on(t.categoryId),
    index("products_game_mode_idx").on(t.gameModeId),
    index("products_listing_idx").on(t.isActive, t.sortOrder),
  ],
);

/* --------------------------------------------------------- product_images */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 200 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

/* ----------------------------------------------------------- media_assets */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    storageKey: text("storage_key").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);

/* ----------------------------------------------------------------- orders */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    purchaseType: purchaseType("purchase_type").notNull(),
    minecraftUsername: varchar("minecraft_username", { length: 32 }).notNull(),
    gameEdition: gameEdition("game_edition").notNull(),
    giftNote: varchar("gift_note", { length: 200 }),
    subtotalPaise: integer("subtotal_paise").notNull(),
    discountPaise: integer("discount_paise").default(0).notNull(),
    totalPaise: integer("total_paise").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    paymentStatus: paymentStatus("payment_status").default("PENDING").notNull(),
    fulfillmentStatus: fulfillmentStatus("fulfillment_status").default("PENDING").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
    paymentExpiresAt: ts("payment_expires_at").notNull(),
    paidAt: ts("paid_at"),
    cancelledAt: ts("cancelled_at"),
    evidenceRequestedAt: ts("evidence_requested_at"),
    evidenceRequestNote: text("evidence_request_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_order_number_uq").on(t.orderNumber),
    uniqueIndex("orders_user_idempotency_uq").on(t.userId, t.idempotencyKey),
    index("orders_user_idx").on(t.userId),
    index("orders_payment_status_idx").on(t.paymentStatus),
    index("orders_fulfillment_status_idx").on(t.fulfillmentStatus),
    index("orders_total_status_idx").on(t.totalPaise, t.paymentStatus),
    index("orders_created_idx").on(t.createdAt),
    index("orders_mc_username_idx").on(t.minecraftUsername),
  ],
);

export type ProductSnapshot = {
  productId: string;
  name: string;
  slug: string;
  type: string;
  imageUrl: string | null;
  categoryName: string | null;
  gameModeName?: string | null;
  shortDescription: string;
  metadata: Record<string, unknown>;
};

/* ------------------------------------------------------------ order_items */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productSnapshot: jsonb("product_snapshot").$type<ProductSnapshot>().notNull(),
    quantity: integer("quantity").default(1).notNull(),
    regularPricePaise: integer("regular_price_paise").notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    discountPaise: integer("discount_paise").default(0).notNull(),
    lineTotalPaise: integer("line_total_paise").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

/* --------------------------------------------------------------- payments */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    amountPaise: integer("amount_paise").notNull(),
    upiId: varchar("upi_id", { length: 120 }).notNull(),
    payeeName: varchar("payee_name", { length: 120 }).notNull(),
    upiUri: text("upi_uri").notNull(),
    method: paymentMethod("method"),
    transactionRef: varchar("transaction_ref", { length: 64 }),
    transactionAt: ts("transaction_at"),
    verifiedAt: ts("verified_at"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    rejectionReason: text("rejection_reason"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_order_uq").on(t.orderId),
    // Postgres treats NULLs as distinct, so this is "unique when present" and prevents UTR reuse.
    uniqueIndex("payments_transaction_ref_uq").on(t.transactionRef),
  ],
);

/* --------------------------------------------------------- payment_emails */
export const paymentEmails = pgTable(
  "payment_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: varchar("message_id", { length: 512 }).notNull(),
    mailbox: varchar("mailbox", { length: 120 }).notNull(),
    imapUid: bigint("imap_uid", { mode: "number" }),
    fromAddress: varchar("from_address", { length: 320 }).notNull(),
    subject: text("subject").default("").notNull(),
    receivedAt: ts("received_at").notNull(),
    parserName: varchar("parser_name", { length: 60 }),
    amountPaise: integer("amount_paise"),
    transactionRef: varchar("transaction_ref", { length: 64 }),
    transactionAt: ts("transaction_at"),
    payerHandle: varchar("payer_handle", { length: 160 }),
    note: text("note"),
    referencedOrderNumber: varchar("referenced_order_number", { length: 32 }),
    bodyExcerpt: text("body_excerpt"),
    status: paymentEmailStatus("status").notNull(),
    matchedOrderId: uuid("matched_order_id").references(() => orders.id, { onDelete: "set null" }),
    matchReason: text("match_reason"),
    candidateOrderIds: jsonb("candidate_order_ids").$type<string[]>().default([]).notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: ts("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("payment_emails_message_id_uq").on(t.messageId),
    index("payment_emails_status_idx").on(t.status),
    index("payment_emails_ref_idx").on(t.transactionRef),
    index("payment_emails_order_idx").on(t.matchedOrderId),
    index("payment_emails_created_idx").on(t.createdAt),
  ],
);

/* ---------------------------------------------------- payment_screenshots */
export const paymentScreenshots = pgTable(
  "payment_screenshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    storageKey: text("storage_key").notNull(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    transactionRef: varchar("transaction_ref", { length: 64 }),
    status: screenshotStatus("status").default("PENDING").notNull(),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: ts("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("payment_screenshots_order_idx").on(t.orderId), index("payment_screenshots_status_idx").on(t.status)],
);

/* ----------------------------------------------------------- fulfillments */
export const fulfillments = pgTable(
  "fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: fulfillmentMethod("method").default("MANUAL").notNull(),
    minecraftUsername: varchar("minecraft_username", { length: 32 }).notNull(),
    gameEdition: gameEdition("game_edition").notNull(),
    productDelivered: text("product_delivered").notNull(),
    startedBy: uuid("started_by").references(() => users.id, { onDelete: "set null" }),
    startedAt: ts("started_at"),
    fulfilledBy: uuid("fulfilled_by").references(() => users.id, { onDelete: "set null" }),
    fulfilledByDiscordId: varchar("fulfilled_by_discord_id", { length: 32 }),
    fulfilledAt: ts("fulfilled_at"),
    deliveryNotes: text("delivery_notes"),
    proofUrl: text("proof_url"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("fulfillments_order_uq").on(t.orderId)],
);

/* -------------------------------------------------- order_status_history */
export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: historyKind("kind").notNull(),
    fromStatus: varchar("from_status", { length: 20 }),
    toStatus: varchar("to_status", { length: 20 }),
    note: text("note"),
    actorType: actorType("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("order_history_order_idx").on(t.orderId, t.createdAt)],
);

/* --------------------------------------------------------- store_settings */
export const storeSettings = pgTable("store_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------- announcements */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").default("").notNull(),
    type: announcementType("type").default("INFO").notNull(),
    linkUrl: text("link_url"),
    isActive: boolean("is_active").default(true).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("announcements_active_idx").on(t.isActive, t.sortOrder)],
);

/* ------------------------------------------------------------- audit_logs */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorDiscordId: varchar("actor_discord_id", { length: 32 }),
    actorType: actorType("actor_type").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_actor_idx").on(t.actorUserId),
  ],
);

export type User = typeof users.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentEmail = typeof paymentEmails.$inferSelect;
export type PaymentScreenshot = typeof paymentScreenshots.$inferSelect;
export type Fulfillment = typeof fulfillments.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
