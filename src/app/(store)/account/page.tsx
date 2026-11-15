import Link from "next/link";
import { and, count, eq, sum } from "drizzle-orm";
import { db } from "db/client";
import { orders } from "db/schema";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { requireUserPage } from "lib/auth/guards";
import { discordAvatarUrl, formatDate, formatDateTime, formatINR } from "lib/utils";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  const [[totals], [gifts]] = await Promise.all([
    db.select({ n: count(), spent: sum(orders.totalPaise) }).from(orders).where(and(eq(orders.userId, user.id), eq(orders.paymentStatus, "PAID"))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.userId, user.id), eq(orders.purchaseType, "GIFT"), eq(orders.paymentStatus, "PAID"))),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-black">Your account</h1>
      <Card>
        <CardContent className="flex flex-col items-start gap-5 pt-5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={discordAvatarUrl(user.discordId, user.avatar, 128)} alt="" className="size-20 rounded-xl border border-border" />
          <div className="flex-1">
            <p className="text-xl font-bold">{user.globalName ?? user.username}</p>
            <p className="text-sm text-muted">@{user.username}</p>
            <p className="mt-1 font-mono text-xs text-muted">Discord ID: {user.discordId}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge>
              {user.adminRole && <Badge variant="gold">{user.adminRole.replace("_", " ")}</Badge>}
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button variant="outline" type="submit">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Paid orders" value={String(totals?.n ?? 0)} />
        <Stat label="Total spent" value={formatINR(Number(totals?.spent ?? 0))} />
        <Stat label="Gifts sent" value={String(gifts?.n ?? 0)} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex justify-between"><span className="text-muted">Member since</span> {formatDate(user.createdAt)}</p>
          <p className="flex justify-between"><span className="text-muted">Last login</span> {formatDateTime(user.lastLoginAt)}</p>
          <div className="pt-3">
            <Button asChild variant="secondary">
              <Link href="/orders">View order history</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
