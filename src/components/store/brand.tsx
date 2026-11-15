import Link from "next/link";
import { Box } from "lucide-react";

export function Brand({ name, logoUrl, href = "/" }: { name: string; logoUrl: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-bold tracking-tight">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-9 rounded-lg object-contain" />
      ) : (
        <span className="grid size-9 place-items-center rounded-lg bg-primary pixel-border">
          <Box className="size-5 text-white" aria-hidden />
        </span>
      )}
      <span className="text-lg">{name}</span>
    </Link>
  );
}
