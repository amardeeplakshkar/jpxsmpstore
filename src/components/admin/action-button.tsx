"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "components/ui/dialog";
import { Field, Input, Textarea } from "components/ui/input";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { api } from "lib/client-api";

type FieldSpec = { name: string; label: string; type?: "text" | "textarea" | "url"; required?: boolean; placeholder?: string; hint?: string; defaultValue?: string };

/**
 * Generic admin action: sends `body` (+ any collected field values) to `url` and refreshes the page.
 * With `fields`, opens a dialog to collect input; with `confirm`, asks for confirmation first.
 */
export function ActionButton({
  url,
  method = "PATCH",
  body = {},
  label,
  fields,
  confirm,
  successMessage,
  onSuccessHref,
  variant,
  size = "sm",
  icon,
  dialogTitle,
  dialogDescription,
}: {
  url: string;
  method?: "PATCH" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  label: string;
  fields?: FieldSpec[];
  confirm?: string;
  successMessage?: string;
  onSuccessHref?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ReactNode;
  dialogTitle?: string;
  dialogDescription?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>(() => Object.fromEntries((fields ?? []).map((f) => [f.name, f.defaultValue ?? ""])));

  async function run() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...body };
      for (const f of fields ?? []) if (values[f.name]?.trim()) payload[f.name] = values[f.name].trim();
      await api(url, { method, json: method === "DELETE" ? undefined : payload });
      toast.success(successMessage ?? "Done");
      setOpen(false);
      if (onSuccessHref) router.push(onSuccessHref);
      else router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const trigger = (
    <Button variant={variant ?? "outline"} size={size} loading={busy && !fields}>
      {icon}
      {label}
    </Button>
  );

  if (fields?.length) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent title={dialogTitle ?? label} description={dialogDescription}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
          >
            {fields.map((f) => (
              <Field key={f.name} label={f.label} htmlFor={`f-${f.name}`} hint={f.hint}>
                {f.type === "textarea" ? (
                  <Textarea id={`f-${f.name}`} required={f.required} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                ) : (
                  <Input id={`f-${f.name}`} type={f.type === "url" ? "url" : "text"} required={f.required} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                )}
              </Field>
            ))}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant={variant === "destructive" ? "destructive" : "default"} loading={busy}>
                {label}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  if (confirm) {
    return <ConfirmDialog trigger={trigger} title={dialogTitle ?? label} description={confirm} confirmLabel={label} destructive={variant === "destructive"} onConfirm={run} />;
  }
  return (
    <Button variant={variant ?? "outline"} size={size} loading={busy} onClick={run}>
      {icon}
      {label}
    </Button>
  );
}
