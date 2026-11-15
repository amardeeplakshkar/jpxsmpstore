import { effectivePricePaise, formatINR, cn } from "lib/utils";

export function Price({ regularPricePaise, salePricePaise, className }: { regularPricePaise: number; salePricePaise: number | null; className?: string }) {
  const price = effectivePricePaise({ regularPricePaise, salePricePaise });
  const onSale = price < regularPricePaise;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="text-xl font-black text-foreground">{formatINR(price)}</span>
      {onSale && <span className="text-sm font-bold text-muted line-through">{formatINR(regularPricePaise)}</span>}
    </div>
  );
}
