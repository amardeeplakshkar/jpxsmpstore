import Link from "next/link";
import { Box } from "lucide-react";

export function Brand({ name, logoUrl, href = "/" }: { name: string; logoUrl: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 text-2xl font-black tracking-tight text-white">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-[38px] rounded-[10px] object-cover shadow-glow" />
      ) : (
        <span className="grid size-[38px] place-items-center rounded-[10px] bg-primary shadow-glow">
          <Box className="size-5 text-black" aria-hidden />
        </span>
      )}
      <span>{name}</span>
    </Link>
  );
}
