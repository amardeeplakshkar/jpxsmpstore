import { PageHeader } from "components/admin/page-header";
import { Pagination } from "components/admin/pagination";
import { Button } from "components/ui/button";
import { EmptyState } from "components/ui/empty-state";
import { Input } from "components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "components/ui/table";
import { auditFiltersSchema, listAuditLogs } from "lib/admin/queries";
import { requireAdminPage } from "lib/auth/guards";
import { formatDateTime } from "lib/utils";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdminPage("audit.view");
  const sp = await searchParams;
  const f = auditFiltersSchema.parse(sp);
  const data = await listAuditLogs(f);
  return (
    <div>
      <PageHeader title="Audit logs" description="Append-only record of logins, admin actions, payment decisions and worker activity." />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="action" placeholder="Action, e.g. order.confirm" defaultValue={f.action} className="w-64" aria-label="Action" />
        <Input name="entity" placeholder="Entity type or ID" defaultValue={f.entity} className="w-64" aria-label="Entity" />
        <Button type="submit">Filter</Button>
      </form>
      {data.rows.length === 0 ? <EmptyState title="No audit entries" /> : (
        <Table>
          <THead><tr><TH>Time</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Details</TH><TH>IP</TH></tr></THead>
          <TBody>
            {data.rows.map((a) => (
              <TR key={a.id}>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</TD>
                <TD className="text-xs">{a.actorType}{a.actorDiscordId && <span className="block font-mono text-muted">{a.actorDiscordId}</span>}</TD>
                <TD className="font-mono text-xs">{a.action}</TD>
                <TD className="text-xs">{a.entityType}<span className="block font-mono text-muted">{a.entityId}</span></TD>
                <TD><pre className="max-w-md overflow-x-auto whitespace-pre-wrap text-[11px] text-muted">{JSON.stringify(a.metadata)}</pre></TD>
                <TD className="text-xs text-muted">{a.ip ?? "-"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} total={data.total} basePath="/admin/audit-logs" params={sp} />
    </div>
  );
}
