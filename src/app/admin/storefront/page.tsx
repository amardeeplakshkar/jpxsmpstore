import { Pencil, Plus, Trash2 } from "lucide-react";
import { isNull, asc, desc } from "drizzle-orm";
import { ActionButton } from "components/admin/action-button";
import { JsonFormDialog, type FormFieldSpec } from "components/admin/json-form-dialog";
import { PageHeader } from "components/admin/page-header";
import { SettingsForm } from "components/admin/settings-form";
import { SocialButtonsEditor } from "components/admin/social-buttons-editor";
import { Badge } from "components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { db } from "db/client";
import { announcements } from "db/schema";
import { requireAdminPage } from "lib/auth/guards";
import { getStorefrontSettings } from "lib/settings";
import { formatDateTime } from "lib/utils";

const announcementFields: FormFieldSpec[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "body", label: "Body", type: "textarea" },
  { name: "type", label: "Type", type: "select", options: [{ value: "INFO", label: "Info" }, { value: "SALE", label: "Sale" }, { value: "UPDATE", label: "Update" }, { value: "WARNING", label: "Warning" }] },
  { name: "linkUrl", label: "Link URL", type: "url" },
  { name: "startsAt", label: "Starts at (optional)", type: "datetime-local" },
  { name: "endsAt", label: "Ends at (optional)", type: "datetime-local" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "isPinned", label: "Pinned", type: "switch" },
  { name: "isActive", label: "Active", type: "switch" },
];

const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function StorefrontPage() {
  await requireAdminPage("storefront.manage");
  const [s, items] = await Promise.all([
    getStorefrontSettings(),
    db.select().from(announcements).where(isNull(announcements.deletedAt)).orderBy(desc(announcements.isPinned), asc(announcements.sortOrder)),
  ]);
  return (
    <div>
      <PageHeader title="Storefront" description="Everything customers see on the public store. Changes apply immediately." />
      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
          <TabsTrigger value="discount">Discount</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="footer">Footer and Discord</TabsTrigger>
          <TabsTrigger value="social">Footer buttons</TabsTrigger>
          <TabsTrigger value="legal">Terms and privacy</TabsTrigger>
        </TabsList>
        <TabsContent value="branding">
          <SettingsForm section="branding" title="Branding" initial={s.branding} fields={[
            { key: "storeName", label: "Store name", type: "text" },
            { key: "tagline", label: "Tagline", type: "text" },
            { key: "logoUrl", label: "Store logo", type: "image" },
          ]} />
        </TabsContent>
        <TabsContent value="homepage">
          <SettingsForm section="homepage" title="Homepage" initial={s.homepage} fields={[
            { key: "heroTitle", label: "Homepage title", type: "text" },
            { key: "heroDescription", label: "Homepage description", type: "textarea", rows: 3 },
            { key: "heroBannerUrl", label: "Hero banner image", type: "image" },
            { key: "introTitle", label: "Introduction title", type: "text" },
            { key: "introBody", label: "Introduction text", type: "textarea", rows: 6, hint: "Blank lines separate paragraphs." },
            { key: "showFeatured", label: "Show featured products on the homepage", type: "switch", hint: "Turn off to hide the Featured Ranks, Featured Crates and Featured Products sections." },
            { key: "howToPurchase", label: "How to purchase steps", type: "pairs", a: "title", b: "body", aLabel: "Step title", bLabel: "Step description" },
          ]} />
          <p className="mt-3 text-sm text-muted">Which products appear is chosen with the Featured switch on the Products page.</p>
        </TabsContent>
        <TabsContent value="server">
          <SettingsForm section="server" title="Minecraft server" initial={s.server} fields={[
            { key: "javaAddress", label: "Java server IP / address", type: "text", placeholder: "play.jpxmc.net" },
            { key: "bedrockAddress", label: "Bedrock address", type: "text" },
            { key: "bedrockPort", label: "Bedrock port", type: "number" },
            { key: "supportedVersions", label: "Supported versions", type: "text", placeholder: "1.8 - 1.21" },
            { key: "serverInfo", label: "Server information", type: "textarea", rows: 5 },
            { key: "statusEnabled", label: "Show live server status and player count", type: "switch", hint: "Uses a public status API. Hidden gracefully if unavailable." },
          ]} />
        </TabsContent>
        <TabsContent value="discount">
          <SettingsForm section="discount" title="Store-wide discount" description="Takes a percentage off every product except those with 'Apply store-wide discount' turned off. Customers always get the lower of this and a product's own sale price; the two never stack." initial={s.discount} fields={[
            { key: "enabled", label: "Discount active", type: "switch" },
            { key: "percent", label: "Discount percentage (1-90)", type: "number" },
            { key: "label", label: "Sale name shown to customers", type: "text", placeholder: "Diwali Sale" },
            { key: "endsAt", label: "Ends at, India time (optional)", type: "datetime-local", hint: "Leave empty to run until you switch it off." },
          ]} />
        </TabsContent>
        <TabsContent value="social">
          <SocialButtonsEditor initial={s.social} />
        </TabsContent>
        <TabsContent value="announcements">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <JsonFormDialog title="New announcement" triggerLabel="New announcement" icon={<Plus />} url="/api/admin/announcements" method="POST" fields={announcementFields} initial={{ type: "INFO", isActive: true, isPinned: false, sortOrder: 0 }} />
            </CardHeader>
            <CardContent>
              {items.length === 0 ? <p className="text-sm text-muted">No announcements.</p> : (
                <ul className="divide-y divide-border">
                  {items.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{a.title} <Badge variant="muted">{a.type}</Badge> {a.isPinned && <Badge variant="gold">Pinned</Badge>} {!a.isActive && <Badge variant="danger">Hidden</Badge>}</p>
                        <p className="text-xs text-muted">{a.startsAt ? `From ${formatDateTime(a.startsAt)} ` : ""}{a.endsAt ? `until ${formatDateTime(a.endsAt)}` : ""}</p>
                      </div>
                      <div className="flex gap-1">
                        <JsonFormDialog title="Edit announcement" triggerLabel="Edit" icon={<Pencil />} variant="ghost" url={`/api/admin/announcements/${a.id}`} method="PATCH" fields={announcementFields}
                          initial={{ title: a.title, body: a.body, type: a.type, linkUrl: a.linkUrl ?? "", startsAt: toLocal(a.startsAt), endsAt: toLocal(a.endsAt), sortOrder: a.sortOrder, isPinned: a.isPinned, isActive: a.isActive }} />
                        <ActionButton url={`/api/admin/announcements/${a.id}`} method="DELETE" label="Delete" variant="destructive" icon={<Trash2 />} confirm="Delete this announcement?" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="footer">
          <SettingsForm section="community" title="Footer and Discord" initial={s.community} fields={[
            { key: "discordInviteUrl", label: "Discord invite URL", type: "url", placeholder: "https://discord.gg/..." },
            { key: "footerText", label: "Footer text", type: "textarea", rows: 3 },
            { key: "footerLinks", label: "Extra footer links", type: "pairs", a: "label", b: "url", aLabel: "Label", bLabel: "URL" },
          ]} />
        </TabsContent>
        <TabsContent value="legal">
          <SettingsForm section="legal" title="Terms and privacy" initial={s.legal} fields={[
            { key: "termsUrl", label: "External terms URL (optional)", type: "url", hint: "If set, /terms redirects here instead of showing the text below." },
            { key: "termsContent", label: "Terms and conditions", type: "textarea", rows: 12 },
            { key: "privacyUrl", label: "External privacy URL (optional)", type: "url" },
            { key: "privacyContent", label: "Privacy policy", type: "textarea", rows: 12 },
          ]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
