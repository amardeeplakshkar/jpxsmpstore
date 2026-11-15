import { BadgePercent } from "lucide-react";
import type { StoreDiscount } from "lib/pricing";
import { cn, formatDateTime } from "lib/utils";

export function DiscountBanner({ discount, className }: { discount: StoreDiscount; className?: string }) {
  if (!discount) return null;
  return (
    <div className={cn("flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent px-6 py-4 text-center shadow-glow sm:flex-row sm:text-left", className)}>
      <p className="flex items-center gap-3 font-black uppercase tracking-wide">
        <BadgePercent className="size-6 text-primary" aria-hidden />
        <span>{discount.label}: <span className="text-glow">{discount.percent}% OFF</span></span>
      </p>
      <p className="text-sm font-bold text-muted">{discount.endsAt ? `Ends ${formatDateTime(discount.endsAt)}` : "Limited time"} · selected items</p>
    </div>
  );
}
