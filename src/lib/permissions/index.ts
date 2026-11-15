import type { AdminRole } from "db/schema";

export const PERMISSIONS = {
  "dashboard.view": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "orders.view": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "orders.note": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "orders.cancel": ["SUPER_ADMIN", "ADMIN"],
  "payments.view": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "payments.verify": ["SUPER_ADMIN", "ADMIN"],
  "payments.refund": ["SUPER_ADMIN"],
  "fulfillment.manage": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "products.manage": ["SUPER_ADMIN", "ADMIN"],
  "categories.manage": ["SUPER_ADMIN", "ADMIN"],
  "media.manage": ["SUPER_ADMIN", "ADMIN"],
  "storefront.manage": ["SUPER_ADMIN", "ADMIN"],
  "users.view": ["SUPER_ADMIN", "ADMIN", "SUPPORT"],
  "users.block": ["SUPER_ADMIN", "ADMIN"],
  "admins.manage": ["SUPER_ADMIN"],
  "settings.payment": ["SUPER_ADMIN"],
  "audit.view": ["SUPER_ADMIN", "ADMIN"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: AdminRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}
