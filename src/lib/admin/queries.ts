import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, sum, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "db/client";
import {
  auditLogs,
  categories,
  fulfillments,
  mediaAssets,
  orderItems,
  orders,
  paymentEmails,
  paymentScreenshots,
  products,
  users,
  FULFILLMENT_STATUSES,
  PAYMENT_STATUSES,
} from "db/schema";

export const PAGE_SIZE = 20;
const page = z.coerce.number().int().min(1).max(10000).catch(1);
const optStr = z.string().trim().max(100).optional().catch(undefined);

/* ------------------------------------------------------------------ dashboard */
export async function getDashboard() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 29 * 86400_000);
  since30.setHours(0, 0, 0, 0);
  const paid = eq(orders.paymentStatus, "PAID");

  const [
    [revenue],
    [today],
    [totalOrders],
    [pendingPayments],
    [verified],
    [pendingFulfillment],
    [totalUsers],
    [activeProducts],
    daily,
    recentOrders,
    recentEmails,
    topProducts,
    [needsReview],
    [emailIssues],
  ] = await Promise.all([
    db.select({ v: sum(orders.totalPaise) }).from(orders).where(paid),
    db.select({ v: sum(orders.totalPaise) }).from(orders).where(and(paid, gte(orders.paidAt, startOfToday))),
    db.select({ v: count() }).from(orders),
    db.select({ v: count() }).from(orders).where(inArray(orders.paymentStatus, ["PENDING", "VERIFYING", "MATCHED"])),
    db.select({ v: count() }).from(orders).where(paid),
    db.select({ v: count() }).from(orders).where(and(paid, inArray(orders.fulfillmentStatus, ["PENDING", "PROCESSING"]))),
    db.select({ v: count() }).from(users),
    db.select({ v: count() }).from(products).where(and(eq(products.isActive, true), isNull(products.deletedAt))),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.paidAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.totalPaise}), 0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(paid, gte(orders.paidAt, since30)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db.query.orders.findMany({ orderBy: [desc(orders.createdAt)], limit: 8, with: { user: true, items: true } }),
    db.select().from(paymentEmails).orderBy(desc(paymentEmails.createdAt)).limit(8),
    db
      .select({
        name: sql<string>`${orderItems.productSnapshot}->>'name'`,
        units: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<number>`sum(${orderItems.lineTotalPaise})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(paid)
      .groupBy(sql`1`)
      .orderBy(sql`3 desc`)
      .limit(5),
    db.select({ v: count() }).from(orders).where(inArray(orders.paymentStatus, ["VERIFYING", "MATCHED"])),
    db
      .select({ v: count() })
      .from(paymentEmails)
      .where(and(inArray(paymentEmails.status, ["UNMATCHED", "AMBIGUOUS", "DUPLICATE"]), isNull(paymentEmails.reviewedAt))),
  ]);

  // Fill missing days so the chart has a continuous axis.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const chart = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since30.getTime() + i * 86400_000 + 330 * 60_000);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    return { day: key.slice(5), revenue: (row?.revenue ?? 0) / 100, orders: row?.orders ?? 0 };
  });

  return {
    stats: {
      totalRevenuePaise: Number(revenue?.v ?? 0),
      todayRevenuePaise: Number(today?.v ?? 0),
      totalOrders: totalOrders.v,
      pendingPayments: pendingPayments.v,
      verifiedPayments: verified.v,
      pendingFulfillment: pendingFulfillment.v,
      totalUsers: totalUsers.v,
      activeProducts: activeProducts.v,
    },
    chart,
    recentOrders,
    recentEmails,
    topProducts,
    alerts: { needsReview: needsReview.v, emailIssues: emailIssues.v },
  };
}

/* --------------------------------------------------------------------- orders */
export const orderFiltersSchema = z.object({
  q: optStr, // order number
  discord: optStr,
  mc: optStr,
  product: optStr,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  purchaseType: z.enum(["SELF", "GIFT"]).optional().catch(undefined),
  edition: z.enum(["JAVA", "BEDROCK"]).optional().catch(undefined),
  payment: z.enum(PAYMENT_STATUSES).optional().catch(undefined),
  fulfillment: z.enum(FULFILLMENT_STATUSES).optional().catch(undefined),
  page,
});
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export async function listOrdersAdmin(f: OrderFilters) {
  const where: SQL[] = [];
  if (f.q) where.push(ilike(orders.orderNumber, `%${f.q}%`));
  if (f.mc) where.push(ilike(orders.minecraftUsername, `%${f.mc}%`));
  if (f.discord) where.push(or(ilike(users.username, `%${f.discord}%`), eq(users.discordId, f.discord))!);
  if (f.product) where.push(sql`exists (select 1 from ${orderItems} oi where oi.order_id = ${orders.id} and oi.product_snapshot->>'name' ilike ${`%${f.product}%`})`);
  if (f.from) where.push(gte(orders.createdAt, new Date(`${f.from}T00:00:00+05:30`)));
  if (f.to) where.push(lt(orders.createdAt, new Date(new Date(`${f.to}T00:00:00+05:30`).getTime() + 86400_000)));
  if (f.purchaseType) where.push(eq(orders.purchaseType, f.purchaseType));
  if (f.edition) where.push(eq(orders.gameEdition, f.edition));
  if (f.payment) where.push(eq(orders.paymentStatus, f.payment));
  if (f.fulfillment) where.push(eq(orders.fulfillmentStatus, f.fulfillment));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        order: orders,
        username: users.username,
        discordId: users.discordId,
        product: sql<string>`(select string_agg(oi.product_snapshot->>'name', ', ') from ${orderItems} oi where oi.order_id = ${orders.id})`,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(cond)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(orders).innerJoin(users, eq(orders.userId, users.id)).where(cond),
  ]);
  return { rows, total, page: f.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getOrderAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      user: true,
      items: true,
      payment: true,
      fulfillment: true,
      screenshots: { orderBy: (s, { desc: d }) => [d(s.createdAt)] },
      history: { orderBy: (h, { asc: a }) => [a(h.createdAt)], with: { actor: true } },
      emails: { orderBy: (e, { desc: d }) => [d(e.createdAt)] },
    },
  });
  return order ?? null;
}

/* ------------------------------------------------------------------- payments */
export const paymentFiltersSchema = z.object({
  status: z.enum(["MATCHED", "UNMATCHED", "AMBIGUOUS", "DUPLICATE", "UNTRUSTED", "PARSE_FAILED", "IGNORED"]).optional().catch(undefined),
  q: optStr,
  page,
});

export async function listPaymentEmails(f: z.infer<typeof paymentFiltersSchema>) {
  const where: SQL[] = [];
  if (f.status) where.push(eq(paymentEmails.status, f.status));
  if (f.q) where.push(or(ilike(paymentEmails.transactionRef, `%${f.q}%`), ilike(paymentEmails.fromAddress, `%${f.q}%`), ilike(paymentEmails.subject, `%${f.q}%`))!);
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.query.paymentEmails.findMany({ where: cond, orderBy: [desc(paymentEmails.createdAt)], limit: PAGE_SIZE, offset: (f.page - 1) * PAGE_SIZE, with: { order: true } }),
    db.select({ total: count() }).from(paymentEmails).where(cond),
  ]);
  return { rows, total, page: f.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listPendingScreenshots() {
  return db.query.paymentScreenshots.findMany({
    where: eq(paymentScreenshots.status, "PENDING"),
    orderBy: [asc(paymentScreenshots.createdAt)],
    limit: 50,
    with: { order: true },
  });
}

export async function listOrdersAwaitingVerification() {
  return db.query.orders.findMany({
    where: inArray(orders.paymentStatus, ["VERIFYING", "MATCHED"]),
    orderBy: [asc(orders.createdAt)],
    limit: 50,
    with: { user: true, payment: true },
  });
}

/* ---------------------------------------------------------------- fulfillment */
export async function fulfillmentQueue(status: "OPEN" | "FULFILLED" = "OPEN") {
  return db.query.orders.findMany({
    where: and(
      eq(orders.paymentStatus, "PAID"),
      status === "OPEN" ? inArray(orders.fulfillmentStatus, ["PENDING", "PROCESSING", "FAILED"]) : eq(orders.fulfillmentStatus, "FULFILLED"),
    ),
    orderBy: status === "OPEN" ? [asc(orders.paidAt)] : [desc(orders.updatedAt)],
    limit: 100,
    with: { user: true, items: true, fulfillment: true },
  });
}

/* ---------------------------------------------------------------------- users */
export const userFiltersSchema = z.object({ q: optStr, status: z.enum(["ACTIVE", "BLOCKED"]).optional().catch(undefined), page });

export async function listUsersAdmin(f: z.infer<typeof userFiltersSchema>) {
  const where: SQL[] = [];
  if (f.q) where.push(or(ilike(users.username, `%${f.q}%`), ilike(users.globalName, `%${f.q}%`), eq(users.discordId, f.q))!);
  if (f.status) where.push(eq(users.status, f.status));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        user: users,
        orderCount: sql<number>`(select count(*)::int from ${orders} o where o.user_id = ${users.id})`,
        spentPaise: sql<number>`(select coalesce(sum(o.total_paise),0)::int from ${orders} o where o.user_id = ${users.id} and o.payment_status = 'PAID')`,
        giftCount: sql<number>`(select count(*)::int from ${orders} o where o.user_id = ${users.id} and o.purchase_type = 'GIFT')`,
      })
      .from(users)
      .where(cond)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(users).where(cond),
  ]);
  return { rows, total, page: f.page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getUserAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return null;
  const userOrders = await db.query.orders.findMany({ where: eq(orders.userId, id), orderBy: [desc(orders.createdAt)], limit: 100, with: { items: true } });
  return { user, orders: userOrders };
}

/* ---------------------------------------------------------------------- audit */
export const auditFiltersSchema = z.object({ action: optStr, entity: optStr, page });
export async function listAuditLogs(f: z.infer<typeof auditFiltersSchema>) {
  const where: SQL[] = [];
  if (f.action) where.push(ilike(auditLogs.action, `%${f.action}%`));
  if (f.entity) where.push(or(eq(auditLogs.entityType, f.entity), eq(auditLogs.entityId, f.entity))!);
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(auditLogs).where(cond).orderBy(desc(auditLogs.createdAt)).limit(50).offset((f.page - 1) * 50),
    db.select({ total: count() }).from(auditLogs).where(cond),
  ]);
  return { rows, total, page: f.page, pageCount: Math.max(1, Math.ceil(total / 50)) };
}

/* ------------------------------------------------------------ catalog / media */
export async function listProductsAdmin() {
  return db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(isNull(products.deletedAt))
    .orderBy(asc(products.type), asc(products.sortOrder), asc(products.createdAt));
}

export async function listCategoriesAdmin() {
  return db
    .select({
      category: categories,
      productCount: sql<number>`(select count(*)::int from ${products} p where p.category_id = ${categories.id} and p.deleted_at is null)`,
    })
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listMedia() {
  return db.select().from(mediaAssets).where(isNull(mediaAssets.deletedAt)).orderBy(desc(mediaAssets.createdAt)).limit(200);
}

export { fulfillments };
