import Link from "next/link";

export function SectionHeading({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[28px] font-black tracking-tight text-white sm:text-[32px]">{title}</h2>
        {subtitle && <p className="mt-1 font-semibold text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-extrabold uppercase text-primary hover:text-glow sm:text-base">
          Browse all →
        </Link>
      )}
    </div>
  );
}
