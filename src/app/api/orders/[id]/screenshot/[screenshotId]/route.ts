import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "db/client";
import { orders, paymentScreenshots } from "db/schema";
import { getCurrentUser } from "lib/auth/session";
import { hasPermission } from "lib/permissions";
import { getObject } from "lib/storage";

/** Streams a private screenshot to its uploader or to an admin with payments.view. Never cached publicly. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; screenshotId: string }> }) {
  const { id, screenshotId } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(screenshotId)) return new NextResponse("Not found", { status: 404 });
  const rows = await db
    .select({ shot: paymentScreenshots, order: orders })
    .from(paymentScreenshots)
    .innerJoin(orders, eq(paymentScreenshots.orderId, orders.id))
    .where(and(eq(paymentScreenshots.id, screenshotId), eq(orders.orderNumber, id.toUpperCase())))
    .limit(1);
  const row = rows[0];
  const isAdmin = hasPermission(user.adminRole, "payments.view") && user.status === "ACTIVE";
  if (!row || (!isAdmin && row.order.userId !== user.id)) return new NextResponse("Not found", { status: 404 });
  const data = await getObject(row.shot.storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": row.shot.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
