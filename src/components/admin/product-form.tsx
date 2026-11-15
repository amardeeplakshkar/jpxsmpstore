"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageInput } from "components/admin/image-input";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "components/ui/input";
import { SwitchField } from "components/ui/switch";
import { api } from "lib/client-api";
import { decimalStringToPaise, paiseToDecimalString, slugify } from "lib/utils";

type ProductType = "RANK" | "CRATE" | "COINS" | "CUSTOM";
type Reward = { name: string; rarity: string; chance?: number; quantity: number };
type Meta = {
  perks: string[];
  durationDays: number | null;
  kits: string[];
  keys: number;
  rewards: Reward[];
  contents: string;
  amount: number;
  bonus: number;
  details: { label: string; value: string }[];
};

export type ProductFormInitial = {
  id: string;
  type: ProductType;
  name: string;
  slug: string;
  categoryId: string | null;
  gameModeId: string | null;
  discountEligible: boolean;
  shortDescription: string;
  description: string;
  imageUrl: string | null;
  gallery: string[];
  regularPricePaise: number;
  salePricePaise: number | null;
  javaAvailable: boolean;
  bedrockAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
};

function initialMeta(m: Record<string, unknown> = {}): Meta {
  return {
    perks: (m.perks as string[]) ?? [],
    durationDays: (m.durationDays as number | null) ?? null,
    kits: (m.kits as string[]) ?? [],
    keys: (m.keys as number) ?? 1,
    rewards: (m.rewards as Reward[]) ?? [],
    contents: (m.contents as string) ?? "",
    amount: (m.amount as number) ?? 1000,
    bonus: (m.bonus as number) ?? 0,
    details: (m.details as { label: string; value: string }[]) ?? [],
  };
}

function buildMetadata(type: ProductType, m: Meta) {
  switch (type) {
    case "RANK":
      return { perks: m.perks.filter(Boolean), durationDays: m.durationDays || null, kits: m.kits.filter(Boolean) };
    case "CRATE":
      return { keys: m.keys, rewards: m.rewards.filter((r) => r.name.trim()), contents: m.contents };
    case "COINS":
      return { amount: m.amount, bonus: m.bonus };
    default:
      return { details: m.details.filter((d) => d.label.trim()) };
  }
}

export type GameModeOption = { id: string; name: string; allowedTypes: string[] };

export function ProductForm({ initial, categories, gameModes = [] }: { initial?: ProductFormInitial; categories: { id: string; name: string }[]; gameModes?: GameModeOption[] }) {
  const router = useRouter();
  const [type, setType] = React.useState<ProductType>(initial?.type ?? "RANK");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(Boolean(initial));
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? "");
  const [gameModeId, setGameModeId] = React.useState(initial?.gameModeId ?? "");
  const [discountEligible, setDiscountEligible] = React.useState(initial?.discountEligible ?? true);
  const [shortDescription, setShort] = React.useState(initial?.shortDescription ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = React.useState(initial?.imageUrl ?? "");
  const [gallery, setGallery] = React.useState<string[]>(initial?.gallery ?? []);
  const [price, setPrice] = React.useState(initial ? paiseToDecimalString(initial.regularPricePaise) : "");
  const [sale, setSale] = React.useState(initial?.salePricePaise != null ? paiseToDecimalString(initial.salePricePaise) : "");
  const [javaAvailable, setJava] = React.useState(initial?.javaAvailable ?? true);
  const [bedrockAvailable, setBedrock] = React.useState(initial?.bedrockAvailable ?? true);
  const [isFeatured, setFeatured] = React.useState(initial?.isFeatured ?? false);
  const [isActive, setActive] = React.useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = React.useState(String(initial?.sortOrder ?? 0));
  const [meta, setMeta] = React.useState<Meta>(initialMeta(initial?.metadata));
  const [busy, setBusy] = React.useState(false);
  const upd = (patch: Partial<Meta>) => setMeta((m) => ({ ...m, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const regularPricePaise = decimalStringToPaise(price);
    const salePricePaise = sale.trim() ? decimalStringToPaise(sale) : null;
    if (regularPricePaise === null) return toast.error("Enter a valid price, e.g. 199 or 199.50");
    if (sale.trim() && salePricePaise === null) return toast.error("Enter a valid sale price");
    setBusy(true);
    try {
      const payload = {
        type,
        name,
        slug,
        categoryId: categoryId || null,
        gameModeId: gameModeId || null,
        discountEligible,
        shortDescription,
        description,
        imageUrl: imageUrl || null,
        gallery: gallery.filter(Boolean),
        regularPricePaise,
        salePricePaise,
        javaAvailable,
        bedrockAvailable,
        isFeatured,
        isActive,
        sortOrder: Number(sortOrder) || 0,
        metadata: buildMetadata(type, meta),
      };
      if (initial) {
        await api(`/api/admin/products/${initial.id}`, { method: "PUT", json: payload });
        toast.success("Product saved");
        router.refresh();
      } else {
        const p = await api<{ id: string }>("/api/admin/products", { method: "POST", json: payload });
        toast.success("Product created");
        router.push(`/admin/products/${p.id}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Product type" htmlFor="type">
              <NativeSelect id="type" value={type} onChange={(e) => setType(e.target.value as ProductType)} disabled={Boolean(initial)}>
                <option value="RANK">Rank</option>
                <option value="CRATE">Crate</option>
                <option value="COINS">Coins</option>
                <option value="CUSTOM">Custom product</option>
              </NativeSelect>
            </Field>
            <Field label="Category" htmlFor="category">
              <NativeSelect id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Game mode" htmlFor="game-mode" hint="Which server store page this appears on">
              <NativeSelect id="game-mode" value={gameModeId} onChange={(e) => setGameModeId(e.target.value)}>
                <option value="">No game mode (general pages only)</option>
                {gameModes.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.allowedTypes.includes(type)}>
                    {m.name}{!m.allowedTypes.includes(type) ? " (does not sell this type)" : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="hidden sm:block" />
            <Field label="Name" htmlFor="name">
              <Input id="name" required value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="Used in the product URL">
              <Input id="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
            </Field>
            <Field label="Short description" htmlFor="short" className="sm:col-span-2">
              <Input id="short" value={shortDescription} maxLength={300} onChange={(e) => setShort(e.target.value)} />
            </Field>
            <Field label="Detailed description" htmlFor="desc" hint="Blank lines separate paragraphs. Start a line with ## for a heading." className="sm:col-span-2">
              <Textarea id="desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{type === "RANK" ? "Rank perks" : type === "CRATE" ? "Crate rewards" : type === "COINS" ? "Coin amount" : "Product details"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {type === "RANK" && (
              <>
                <Field label="Duration (days)" htmlFor="duration" hint="Leave empty or 0 for a lifetime rank">
                  <Input id="duration" type="number" min={0} value={meta.durationDays ?? ""} onChange={(e) => upd({ durationDays: e.target.value ? Number(e.target.value) : null })} />
                </Field>
                <ListEditor label="Perks" items={meta.perks} onChange={(perks) => upd({ perks })} placeholder="/fly in lobby" />
                <ListEditor label="Kits" items={meta.kits} onChange={(kits) => upd({ kits })} placeholder="Kit name" />
              </>
            )}
            {type === "CRATE" && (
              <>
                <Field label="Number of keys" htmlFor="keys"><Input id="keys" type="number" min={1} value={meta.keys} onChange={(e) => upd({ keys: Number(e.target.value) || 1 })} /></Field>
                <Field label="Crate contents (free text)" htmlFor="contents"><Textarea id="contents" value={meta.contents} onChange={(e) => upd({ contents: e.target.value })} /></Field>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rewards</p>
                  {meta.rewards.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_130px_80px_80px_auto] gap-2">
                      <Input aria-label="Reward name" value={r.name} placeholder="Diamond sword" onChange={(e) => upd({ rewards: meta.rewards.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                      <NativeSelect aria-label="Rarity" value={r.rarity} onChange={(e) => upd({ rewards: meta.rewards.map((x, j) => (j === i ? { ...x, rarity: e.target.value } : x)) })}>
                        {["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].map((x) => <option key={x}>{x}</option>)}
                      </NativeSelect>
                      <Input aria-label="Chance %" type="number" step="0.01" min={0} max={100} placeholder="%" value={r.chance ?? ""} onChange={(e) => upd({ rewards: meta.rewards.map((x, j) => (j === i ? { ...x, chance: e.target.value === "" ? undefined : Number(e.target.value) } : x)) })} />
                      <Input aria-label="Quantity" type="number" min={1} value={r.quantity} onChange={(e) => upd({ rewards: meta.rewards.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x)) })} />
                      <Button type="button" size="icon" variant="ghost" aria-label="Remove reward" onClick={() => upd({ rewards: meta.rewards.filter((_, j) => j !== i) })}><Trash2 /></Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => upd({ rewards: [...meta.rewards, { name: "", rarity: "COMMON", quantity: 1 }] })}><Plus /> Add reward</Button>
                </div>
              </>
            )}
            {type === "COINS" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Coins" htmlFor="amount"><Input id="amount" type="number" min={1} value={meta.amount} onChange={(e) => upd({ amount: Number(e.target.value) || 1 })} /></Field>
                <Field label="Bonus coins" htmlFor="bonus"><Input id="bonus" type="number" min={0} value={meta.bonus} onChange={(e) => upd({ bonus: Number(e.target.value) || 0 })} /></Field>
              </div>
            )}
            {type === "CUSTOM" && (
              <div className="space-y-2">
                {meta.details.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input aria-label="Label" placeholder="Label" value={d.label} onChange={(e) => upd({ details: meta.details.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <Input aria-label="Value" placeholder="Value" value={d.value} onChange={(e) => upd({ details: meta.details.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                    <Button type="button" size="icon" variant="ghost" aria-label="Remove" onClick={() => upd({ details: meta.details.filter((_, j) => j !== i) })}><Trash2 /></Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => upd({ details: [...meta.details, { label: "", value: "" }] })}><Plus /> Add detail</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Images</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Main image" htmlFor="image"><ImageInput id="image" value={imageUrl} onChange={setImageUrl} /></Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Gallery</p>
              {gallery.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1"><ImageInput id={`g-${i}`} value={g} onChange={(v) => setGallery(gallery.map((x, j) => (j === i ? v : x)))} /></div>
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove image" onClick={() => setGallery(gallery.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setGallery([...gallery, ""])}><Plus /> Add gallery image</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Pricing (INR)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Regular price (₹)" htmlFor="price"><Input id="price" required inputMode="decimal" placeholder="199.00" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="Sale price (₹)" htmlFor="sale" hint="Optional. Must be lower than the regular price."><Input id="sale" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} /></Field>
            <SwitchField id="discount-eligible" label="Apply store-wide discount" description="Turn off to exclude this item from the discount set under Storefront > Discount. Its own sale price still applies." checked={discountEligible} onCheckedChange={setDiscountEligible} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Availability</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SwitchField id="active" label="Active" description="Visible and purchasable in the store" checked={isActive} onCheckedChange={setActive} />
            <SwitchField id="featured" label="Featured" description="Shown on the homepage" checked={isFeatured} onCheckedChange={setFeatured} />
            <SwitchField id="java" label="Java Edition" checked={javaAvailable} onCheckedChange={setJava} />
            <SwitchField id="bedrock" label="Bedrock Edition" checked={bedrockAvailable} onCheckedChange={setBedrock} />
            <Field label="Display order" htmlFor="sort" hint="Lower numbers appear first"><Input id="sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></Field>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full" loading={busy}>{initial ? "Save changes" : "Create product"}</Button>
      </div>
    </form>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label={`${label} ${i + 1}`} value={v} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button type="button" size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, ""])}><Plus /> Add</Button>
    </div>
  );
}
