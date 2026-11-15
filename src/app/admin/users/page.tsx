import Link from "next/link";
import { PageHeader } from "components/admin/page-header";
import { Pagination } from "components/admin/pagination";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { Input, NativeSelect } from "components/ui/input";
import { StatusBadge } from "components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { listUsersAdmin, userFiltersSchema } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { discordAvatarUrl, formatDate, formatDateTime, formatINR } from "lib/utils";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdminPage("users.view");
  const sp = await searchParams;
  const f = userFiltersSchema.parse(sp);
  const data = await listUsersAdmin(f);
  return (
    <div>
      <PageHeader title="Users" description="Everyone who has logged in with Discord, including users with no purchases." />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" placeholder="Username or Discord ID" defaultValue={f.q} className="w-64" aria-label="Search users" />
        <NativeSelect name="status" defaultValue={f.status ?? ""} className="w-40" aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
        </NativeSelect>
        <Button type="submit">Search</Button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="No users found" /> : (
        <Table>
          <THead><tr><TH>User</TH><TH>Discord ID</TH><TH>Registered</TH><TH>Last login</TH><TH>Orders</TH><TH>Spent</TH><TH>Gifts</TH><TH>Status</TH></tr></THead>
          <TBody>
            {data.rows.map(({ user: u, orderCount, spentPaise, giftCount }) => (
              <TR key={u.id}>
                <TD>
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2 hover:text-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={discordAvatarUrl(u.discordId, u.avatar, 32)} alt="" className="size-7 rounded-md" />
                    <span>{u.globalName ?? u.username}<span className="block text-xs text-muted">@{u.username}</span></span>
                  </Link>
                </TD>
                <TD className="font-mono text-xs">{u.discordId}</TD>
                <TD className="text-xs">{formatDate(u.createdAt)}</TD>
                <TD className="text-xs">{formatDateTime(u.lastLoginAt)}</TD>
                <TD>{orderCount}</TD>
                <TD>{formatINR(spentPaise)}</TD>
                <TD>{giftCount}</TD>
                <TD><StatusBadge status={u.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} total={data.total} basePath="/admin/users" params={sp} />
    </div>
  );
}
