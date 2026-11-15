import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { ActionButton } from "components/admin/action-button";
import { ImapTestButton } from "components/admin/imap-test-button";
import { JsonFormDialog } from "components/admin/json-form-dialog";
import { PageHeader } from "components/admin/page-header";
import { SettingsForm } from "components/admin/settings-form";
import { Badge } from "components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "components/ui/card";
import { EmptyState } from "components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { db } from "db/client";
import { adminUsers, users } from "db/schema";
import { requireAdminPage } from "lib/auth/guards";
import { hasPermission } from "lib/permissions";
import { getWorkerHeartbeat } from "lib/queue";
import { getPublicImap, getSetting } from "lib/settings";
import { formatDateTime } from "lib/utils";

export default async function SettingsPage() {
  const admin = await requireAdminPage("dashboard.view");
  const canPayment = hasPermission(admin.adminRole, "settings.payment");
  const canAdmins = hasPermission(admin.adminRole, "admins.manage");
  if (!canPayment && !canAdmins) {
    return <EmptyState title="No settings available" description="Payment settings and admin roles are managed by a SUPER_ADMIN." />;
  }
  const [payment, imap, worker, admins] = await Promise.all([
    getSetting("payment"),
    getPublicImap(),
    getWorkerHeartbeat(),
    db.select({ admin: adminUsers, user: users }).from(adminUsers).leftJoin(users, eq(adminUsers.userId, users.id)).orderBy(asc(adminUsers.createdAt)),
  ]);
  return (
    <div>
      <PageHeader title="Settings" description="Payments, email verification and admin access." />
      <Tabs defaultValue={canPayment ? "payment" : "admins"}>
        <TabsList>
          {canPayment && <TabsTrigger value="payment">UPI payments</TabsTrigger>}
          {canPayment && <TabsTrigger value="imap">Email verification (IMAP)</TabsTrigger>}
          {canAdmins && <TabsTrigger value="admins">Admin roles</TabsTrigger>}
        </TabsList>
        {canPayment && (
          <TabsContent value="payment">
            <SettingsForm section="payment" title="UPI payments" description="New orders use these values. Existing orders keep the UPI ID they were created with." initial={payment} fields={[
              { key: "upiId", label: "UPI ID", type: "text", placeholder: "merchant@okaxis" },
              { key: "payeeName", label: "Payee name", type: "text" },
              { key: "instructions", label: "Payment instructions", type: "textarea", rows: 4 },
              { key: "qrEnabled", label: "UPI QR payments enabled", type: "switch", hint: "When off, checkout is disabled." },
              { key: "expiryMinutes", label: "Payment expiry (minutes)", type: "number" },
              { key: "screenshotEnabled", label: "Allow screenshot uploads", type: "switch" },
              { key: "maxScreenshotsPerOrder", label: "Max screenshots per order", type: "number" },
              { key: "maxScreenshotSizeMb", label: "Max screenshot size (MB)", type: "number" },
              { key: "autoConfirmHighConfidence", label: "Auto-confirm high-confidence email matches", type: "switch", hint: "Only when the bank email contains the order ID, exact amount, a transaction reference and a valid time. Everything else waits for an admin." },
              { key: "paymentTimeToleranceMinutes", label: "Payment time tolerance (minutes)", type: "number", hint: "How far outside the order's payment window a bank timestamp may fall." },
            ]} />
          </TabsContent>
        )}
        {canPayment && (
          <TabsContent value="imap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Worker status</CardTitle>
                <CardDescription>{worker ? `Last heartbeat ${formatDateTime(worker.at)} · polling every ${worker.pollIntervalSeconds}s · last poll ${worker.lastPollAt ? formatDateTime(worker.lastPollAt) : "never"}` : "The payment worker has not reported yet. Start the worker container."}</CardDescription>
                {worker?.lastError && <p className="text-sm text-rose-300">Last error: {worker.lastError}</p>}
              </CardHeader>
            </Card>
            <SettingsForm
              section="imap"
              title="IMAP mailbox"
              description="The worker reads bank or UPI credit alerts from this mailbox. The password is encrypted with AES-256-GCM and never returned to the browser."
              initial={{ ...imap, password: "" }}
              fields={[
                { key: "enabled", label: "Enable email payment verification", type: "switch" },
                { key: "host", label: "IMAP host", type: "text", placeholder: "imap.gmail.com" },
                { key: "port", label: "IMAP port", type: "number" },
                { key: "secure", label: "Use TLS", type: "switch" },
                { key: "username", label: "IMAP username", type: "text" },
                { key: "password", label: imap.passwordSet ? "IMAP password (saved; leave blank to keep)" : "IMAP password", type: "password" },
                { key: "mailbox", label: "Mailbox / folder", type: "text" },
                { key: "pollingIntervalSeconds", label: "Polling interval (seconds)", type: "number" },
                { key: "trustedSenders", label: "Trusted senders", type: "lines", hint: "One per line. Exact address (alerts@hdfcbank.net) or domain (@hdfcbank.net). Emails from anyone else are never used as payment evidence." },
              ]}
              extra={(v) => <ImapTestButton values={v} />}
            />
          </TabsContent>
        )}
        {canAdmins && (
          <TabsContent value="admins">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Admin roles</CardTitle>
                  <CardDescription>SUPER_ADMIN: everything. ADMIN: catalog, storefront, payments, users. SUPPORT: orders, fulfillment, read-only payments.</CardDescription>
                </div>
                <JsonFormDialog title="Add admin" triggerLabel="Add admin" icon={<Plus />} url="/api/admin/admins" method="POST" initial={{ role: "SUPPORT" }} fields={[
                  { name: "discordId", label: "Discord user ID", type: "text", required: true, hint: "Enable Developer Mode in Discord, then right-click the user and Copy User ID." },
                  { name: "role", label: "Role", type: "select", options: [{ value: "SUPPORT", label: "Support" }, { value: "ADMIN", label: "Admin" }, { value: "SUPER_ADMIN", label: "Super admin" }] },
                ]} />
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {admins.map(({ admin: a, user: u }) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{u ? (u.globalName ?? u.username) : "Not logged in yet"} <Badge variant="gold">{a.role}</Badge> {!a.isActive && <Badge variant="danger">Revoked</Badge>}</p>
                        <p className="font-mono text-xs text-muted">{a.discordId}</p>
                      </div>
                      {a.discordId !== admin.discordId && (
                        <div className="flex gap-1">
                          {(["SUPER_ADMIN", "ADMIN", "SUPPORT"] as const).filter((r) => r !== a.role).map((r) => (
                            <ActionButton key={r} url={`/api/admin/admins/${a.id}`} body={{ role: r, isActive: true }} label={`Make ${r.replace("_", " ").toLowerCase()}`} variant="ghost" confirm={`Change role to ${r}?`} />
                          ))}
                          {a.isActive ? (
                            <ActionButton url={`/api/admin/admins/${a.id}`} body={{ isActive: false }} label="Revoke" variant="destructive" confirm="Revoke admin access? They keep their customer account." />
                          ) : (
                            <ActionButton url={`/api/admin/admins/${a.id}`} body={{ isActive: true }} label="Restore" confirm="Restore admin access?" />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
