"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Receipt, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "components/ui/dropdown-menu";

export function UserMenu({ user }: { user: { name: string; avatar: string; isAdmin: boolean } | null }) {
  const pathname = usePathname();
  if (!user) {
    return (
      <a href={`/api/auth/discord?returnTo=${encodeURIComponent(pathname || "/")}`} className="btn3d btn3d-accent h-11 px-6 text-sm">
        Login
      </a>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full border border-border bg-white/5 py-1 pl-1 pr-4 transition hover:bg-white/10 cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" className="size-[34px] rounded-full border-2 border-primary" />
        <span className="hidden max-w-32 truncate text-[13px] font-extrabold uppercase sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Signed in as {user.name}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <Receipt /> My orders
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard">
              <LayoutDashboard /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-300 hover:bg-danger/15 cursor-pointer">
            <LogOut className="size-4" /> Log out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
