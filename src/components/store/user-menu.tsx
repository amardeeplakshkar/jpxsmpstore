"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Receipt, User } from "lucide-react";
import { Button } from "components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "components/ui/dropdown-menu";
import { DiscordIcon } from "components/store/discord-icon";

export function UserMenu({ user }: { user: { name: string; avatar: string; isAdmin: boolean } | null }) {
  const pathname = usePathname();
  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <a href={`/api/auth/discord?returnTo=${encodeURIComponent(pathname || "/")}`}>
          <DiscordIcon /> Log in
        </a>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm hover:border-primary/60 cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" className="size-7 rounded-md" />
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Signed in as {user.name}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User /> Account
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
          <button type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-300 hover:bg-danger/15 cursor-pointer">
            <LogOut className="size-4" /> Log out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
