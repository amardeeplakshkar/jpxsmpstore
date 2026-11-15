"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageInput } from "components/admin/image-input";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "components/ui/card";
import { Field, Input, Textarea } from "components/ui/input";
import { SwitchField } from "components/ui/switch";
import { api } from "lib/client-api";

export type SettingField =
  | { key: string; label: string; type: "text" | "url" | "number" | "password"; hint?: string; placeholder?: string }
  | { key: string; label: string; type: "textarea"; hint?: string; rows?: number }
  | { key: string; label: string; type: "image"; hint?: string }
  | { key: string; label: string; type: "switch"; hint?: string }
  | { key: string; label: string; type: "lines"; hint?: string }
  | { key: string; label: string; type: "pairs"; hint?: string; a: string; b: string; aLabel: string; bLabel: string };

/** Generic settings section editor. Submits `{ section, value }` to PUT /api/admin/settings. */
export function SettingsForm({ section, title, description, fields, initial, extra }: { section: string; title: string; description?: string; fields: SettingField[]; initial: Record<string, unknown>; extra?: (values: Record<string, unknown>) => React.ReactNode }) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = React.useState(false);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const value: Record<string, unknown> = { ...values };
      for (const f of fields) {
        if (f.type === "number") value[f.key] = Number(values[f.key]);
        if (f.type === "lines") value[f.key] = String(values[f.key] ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
        if (f.type === "password" && !values[f.key]) delete value[f.key];
      }
      await api("/api/admin/settings", { method: "PUT", json: { section, value } });
      toast.success(`${title} saved`);
      if (fields.some((f) => f.type === "password")) setValues((s) => { const n = { ...s }; for (const f of fields) if (f.type === "password") n[f.key] = ""; return n; });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          {fields.map((f) => {
            const id = `${section}-${f.key}`;
            const v = values[f.key];
            switch (f.type) {
              case "switch":
                return <SwitchField key={f.key} id={id} label={f.label} description={f.hint} checked={Boolean(v)} onCheckedChange={(x) => set(f.key, x)} />;
              case "textarea":
                return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><Textarea id={id} rows={f.rows ?? 4} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} /></Field>;
              case "image":
                return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><ImageInput id={id} value={String(v ?? "")} onChange={(x) => set(f.key, x)} /></Field>;
              case "lines":
                return <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}><Textarea id={id} value={Array.isArray(v) ? v.join("\n") : String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} /></Field>;
              case "pairs": {
                const list = (Array.isArray(v) ? v : []) as Record<string, string>[];
                return (
                  <div key={f.key} className="space-y-2">
                    <p className="text-sm font-medium">{f.label}</p>
                    {f.hint && <p className="text-xs text-muted">{f.hint}</p>}
                    {list.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                        <Input aria-label={f.aLabel} placeholder={f.aLabel} value={item[f.a] ?? ""} onChange={(e) => set(f.key, list.map((x, j) => (j === i ? { ...x, [f.a]: e.target.value } : x)))} />
                        <Input aria-label={f.bLabel} placeholder={f.bLabel} value={item[f.b] ?? ""} onChange={(e) => set(f.key, list.map((x, j) => (j === i ? { ...x, [f.b]: e.target.value } : x)))} />
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => set(f.key, list.filter((_, j) => j !== i))}><Trash2 /></Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={() => set(f.key, [...list, { [f.a]: "", [f.b]: "" }])}><Plus /> Add</Button>
                  </div>
                );
              }
              default:
                return (
                  <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}>
                    <Input id={id} type={f.type} placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} autoComplete={f.type === "password" ? "new-password" : undefined} />
                  </Field>
                );
            }
          })}
          {extra?.(values)}
          <Button type="submit" loading={busy}>Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
