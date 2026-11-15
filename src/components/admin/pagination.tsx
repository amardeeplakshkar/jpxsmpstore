import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "lib/utils";

export function Pagination({ page, pageCount, total, basePath, params }: { page: number; pageCount: number; total: number; basePath: string; params: Record<string, string | undefined> }) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  const cls = "inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-elevated";
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {total} result{total === 1 ? "" : "s"} · page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={cls} href={href(page - 1)}>
            <ChevronLeft className="size-4" /> Prev
          </Link>
        ) : (
          <span className={cn(cls, "opacity-40")}>
            <ChevronLeft className="size-4" /> Prev
          </span>
        )}
        {page < pageCount ? (
          <Link className={cls} href={href(page + 1)}>
            Next <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(cls, "opacity-40")}>
            Next <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
