"use client";

import * as React from "react";
import { ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import type { ApiResponse } from "lib/api";

/** URL field with an upload button that stores the file in the media library. */
export function ImageInput({ id, value, onChange }: { id: string; value: string; onChange: (url: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd, credentials: "same-origin" });
      const body = (await res.json()) as ApiResponse<{ url: string }>;
      if (!body.ok) throw new Error(body.error.message);
      onChange(body.data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="size-10 shrink-0 rounded-md border border-border bg-elevated object-contain" />
      )}
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload" />
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => ref.current?.click()}><ImageUp /> Upload</Button>
      {value && <Button type="button" variant="ghost" size="icon" aria-label="Clear image" onClick={() => onChange("")}><X /></Button>}
    </div>
  );
}
