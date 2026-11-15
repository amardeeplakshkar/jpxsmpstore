import { Info, Megaphone, Sparkles, TriangleAlert } from "lucide-react";
import type { Announcement } from "db/schema";

const ICONS = { INFO: Info, SALE: Sparkles, UPDATE: Megaphone, WARNING: TriangleAlert } as const;
const COLORS = { INFO: "text-secondary", SALE: "text-accent", UPDATE: "text-violet-300", WARNING: "text-rose-300" } as const;

export function Announcements({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="announcements" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="announcements" className="mb-4 text-2xl font-bold">Announcements</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a) => {
          const Icon = ICONS[a.type];
          return (
            <article key={a.id} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
              <Icon className={`mt-0.5 size-5 shrink-0 ${COLORS[a.type]}`} aria-hidden />
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted">{a.body}</p>}
                {a.linkUrl && (
                  <a href={a.linkUrl} className="mt-2 inline-block text-sm font-medium text-secondary hover:underline" rel="noopener noreferrer">
                    Learn more
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
