"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Receipt, User } from "lucide-react";
import { useSession } from "components/auth/session-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "components/ui/dropdown-menu";

export function UserMenu() {
  const pathname = usePathname();
  const { ready, user } = useSession();
  // Same footprint as the Login button while the session loads, so the navbar doesn't jump.
  if (!ready) return <span aria-hidden className="h-10 w-10 animate-pulse rounded-full bg-white/5 sm:h-11 sm:w-[92px] sm:rounded-xl" />;
  if (!user) {
    return (
      <a href={`/api/auth/discord?returnTo=${encodeURIComponent(pathname || "/")}`} className="btn3d btn3d-accent h-10 px-4 text-xs sm:h-11 sm:px-6 sm:text-sm">
        Login
      </a>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-white/5 p-[3px] transition sm:py-1 sm:pl-1 sm:pr-4 hover:bg-white/10 cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" className="size-8 rounded-full border-2 border-primary sm:size-[34px]" />
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
