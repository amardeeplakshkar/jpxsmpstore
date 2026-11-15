import { relations } from "drizzle-orm";
import {
  adminUsers,
  categories,
  gameModes,
  fulfillments,
  orderItems,
  orderStatusHistory,
  orders,
  paymentEmails,
  paymentScreenshots,
  payments,
  productImages,
  products,
  sessions,
  users,
} from "db/schema/tables";

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  orders: many(orders),
  admin: one(adminUsers, { fields: [users.id], references: [adminUsers.userId] }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const gameModesRelations = relations(gameModes, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  gameMode: one(gameModes, { fields: [products.gameModeId], references: [gameModes.id] }),
  images: many(productImages),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  payment: one(payments, { fields: [orders.id], references: [payments.orderId] }),
  fulfillment: one(fulfillments, { fields: [orders.id], references: [fulfillments.orderId] }),
  screenshots: many(paymentScreenshots),
  history: many(orderStatusHistory),
  emails: many(paymentEmails),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const paymentEmailsRelations = relations(paymentEmails, ({ one }) => ({
  order: one(orders, { fields: [paymentEmails.matchedOrderId], references: [orders.id] }),
}));
export const paymentScreenshotsRelations = relations(paymentScreenshots, ({ one }) => ({
  order: one(orders, { fields: [paymentScreenshots.orderId], references: [orders.id] }),
}));
export const fulfillmentsRelations = relations(fulfillments, ({ one }) => ({
  order: one(orders, { fields: [fulfillments.orderId], references: [orders.id] }),
}));
export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  actor: one(users, { fields: [orderStatusHistory.actorUserId], references: [users.id] }),
}));
