import Link from "next/link";
import { and, count, eq, sum } from "drizzle-orm";
import { LogOut, Receipt, User } from "lucide-react";
import { db } from "db/client";
import { orders } from "db/schema";
import { requireUserPage } from "lib/auth/guards";
import { discordAvatarUrl, formatDate, formatDateTime, formatINR } from "lib/utils";

export const metadata = { title: "Profile" };

// Per-user page: always rendered on request (never cached).
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  const [[totals], [gifts]] = await Promise.all([
    db.select({ n: count(), spent: sum(orders.totalPaise) }).from(orders).where(and(eq(orders.userId, user.id), eq(orders.paymentStatus, "PAID"))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.userId, user.id), eq(orders.purchaseType, "GIFT"), eq(orders.paymentStatus, "PAID"))),
  ]);
  const name = user.globalName ?? user.username;
  return (
    <div className="mx-auto grid max-w-[1000px] items-start gap-8 px-5 py-12 md:grid-cols-[280px_1fr]">
      <aside className="rounded-[20px] border border-[#1e2430] bg-[#11151d] px-6 py-10 text-center shadow-[0_20px_40px_rgb(0_0_0/0.4)] md:sticky md:top-[110px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={discordAvatarUrl(user.discordId, user.avatar, 128)} alt="" className="mx-auto mb-5 size-[120px] rounded-2xl border-2 border-primary bg-black object-cover shadow-[0_0_20px_rgb(168_85_247/0.3)]" />
        <h1 className="mb-3 text-[22px] font-black uppercase tracking-wide text-white">{name}</h1>
        <span className={`mb-10 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase text-white ${user.status === "ACTIVE" ? "bg-primary text-black" : "bg-red-500"}`}>
          {user.adminRole ? user.adminRole.replace("_", " ") : user.status === "ACTIVE" ? "Member" : "Blocked"}
        </span>
        <nav className="flex flex-col gap-2 text-left" aria-label="Profile">
          <Link href="/account" aria-current="page" className="flex items-center gap-3 rounded-[10px] border border-primary/20 bg-primary/5 px-5 py-3.5 text-sm font-extrabold text-primary">
            <User className="size-4" /> Overview
          </Link>
          <Link href="/orders" className="flex items-center gap-3 rounded-[10px] border border-transparent px-5 py-3.5 text-sm font-extrabold text-muted transition hover:bg-white/5 hover:text-white">
            <Receipt className="size-4" /> Order history
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="flex w-full items-center gap-3 rounded-[10px] border border-transparent px-5 py-3.5 text-sm font-extrabold text-red-300 transition hover:bg-red-500/10 cursor-pointer">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </nav>
      </aside>
      <section className="min-h-[550px] rounded-[20px] border border-[#1e2430] bg-[#11151d] p-7 shadow-[0_20px_40px_rgb(0_0_0/0.4)] sm:p-11">
        <h2 className="mb-2 text-[28px] font-black text-white">Overview</h2>
        <p className="mb-9 font-semibold text-slate-500">Your purchases and account details.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Stat label="Paid orders" value={String(totals?.n ?? 0)} color="#a855f7" />
          <Stat label="Total spent" value={formatINR(Number(totals?.spent ?? 0))} color="#10b981" />
          <Stat label="Gifts sent" value={String(gifts?.n ?? 0)} color="#f59e0b" />
        </div>
        <dl className="mt-8 space-y-3">
          {[
            ["Discord", `@${user.username}`],
            ["Discord ID", user.discordId],
            ["Member since", formatDate(user.createdAt)],
            ["Last login", formatDateTime(user.lastLoginAt)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 rounded-xl bg-sunken px-6 py-4 text-sm shadow-[0_5px_15px_rgb(0_0_0/0.2)]">
              <dt className="font-bold text-slate-500">{k}</dt>
              <dd className="text-right font-extrabold text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-box flex flex-col gap-1 p-6" style={{ ["--st" as string]: color }}>
      <h3 className="text-[11px] font-black uppercase tracking-wider text-muted">{label}</h3>
      <p className="text-[28px] font-black text-white">{value}</p>
    </div>
  );
}
