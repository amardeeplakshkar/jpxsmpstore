"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "components/ui/input";
import { SwitchField } from "components/ui/switch";
import { api } from "lib/client-api";

export type FormFieldSpec =
  | { name: string; label: string; type: "text" | "url" | "number" | "datetime-local"; required?: boolean; hint?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; hint?: string }
  | { name: string; label: string; type: "switch"; hint?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; hint?: string };

/** Dialog form that submits a JSON object built from typed fields. Used for categories, announcements, admins. */
export function JsonFormDialog({ title, triggerLabel, url, method, fields, initial = {}, variant, size = "sm", icon }: {
  title: string;
  triggerLabel: string;
  url: string;
  method: "POST" | "PATCH" | "PUT";
  fields: FormFieldSpec[];
  initial?: Record<string, unknown>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, unknown>>(initial);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.type === "switch") payload[f.name] = Boolean(v);
        else if (f.type === "number") payload[f.name] = v === "" || v === undefined ? undefined : Number(v);
        else if (f.type === "select") payload[f.name] = v === "" || v === undefined ? null : v;
        else payload[f.name] = v === undefined || v === "" ? (f.type === "text" || f.type === "textarea" ? (f.required ? "" : null) : null) : v;
      }
      await api(url, { method, json: payload });
      toast.success("Saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValues(initial); }}>
      <DialogTrigger asChild>
        <Button variant={variant ?? "default"} size={size}>{icon}{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent title={title}>
        <form onSubmit={submit} className="space-y-4">
          {fields.map((f) => {
            const id = `jf-${f.name}`;
            if (f.type === "switch") return <SwitchField key={f.name} id={id} label={f.label} description={f.hint} checked={Boolean(values[f.name])} onCheckedChange={(v) => set(f.name, v)} />;
            return (
              <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint}>
                {f.type === "textarea" ? (
                  <Textarea id={id} required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} />
                ) : f.type === "select" ? (
                  <NativeSelect id={id} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </NativeSelect>
                ) : (
                  <Input id={id} type={f.type} required={f.required} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} />
                )}
              </Field>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
