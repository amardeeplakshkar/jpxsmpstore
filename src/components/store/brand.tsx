import Link from "next/link";
import { Box } from "lucide-react";

export function Brand({ name, logoUrl, href = "/" }: { name: string; logoUrl: string; href?: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5 text-xl font-black tracking-tight text-white sm:gap-3 sm:text-2xl">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-9 shrink-0 rounded-[10px] object-cover shadow-glow sm:size-[38px]" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary shadow-glow sm:size-[38px]">
          <Box className="size-5 text-black" aria-hidden />
        </span>
      )}
      <span className="truncate">{name}</span>
    </Link>
  );
}
