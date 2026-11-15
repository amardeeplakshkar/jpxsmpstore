"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { ConfirmDialog } from "components/ui/confirm-dialog";
import { CopyButton } from "components/ui/copy-button";
import { EmptyState } from "components/ui/empty-state";
import { api } from "lib/client-api";
import type { ApiResponse } from "lib/api";

type Item = { id: string; url: string; filename: string; sizeBytes: number; createdAt: string };

export function MediaLibrary({ items }: { items: Item[] }) {
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd, credentials: "same-origin" });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (body.ok) toast.success(`Uploaded ${file.name}`);
      else toast.error(`${file.name}: ${body.error.message}`);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      <Button onClick={() => ref.current?.click()} loading={busy}><ImageUp /> Upload images</Button>
      {items.length === 0 ? <EmptyState title="No media yet" description="PNG, JPG or WebP up to 5 MB." /> : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <figure key={m.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.filename} className="aspect-square w-full bg-elevated object-contain p-2" loading="lazy" />
              <figcaption className="space-y-2 p-2">
                <p className="truncate text-xs" title={m.filename}>{m.filename}</p>
                <p className="text-[11px] text-muted">{(m.sizeBytes / 1024).toFixed(0)} KB</p>
                <div className="flex gap-1">
                  <CopyButton value={m.url.startsWith("/") ? `${window.location.origin}${m.url}` : m.url} label="URL" />
                  <ConfirmDialog
                    trigger={<Button size="icon" variant="ghost" aria-label="Delete image"><Trash2 className="text-rose-400" /></Button>}
                    title="Delete image?"
                    description="Products still pointing at this URL will show no image."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={async () => {
                      try {
                        await api(`/api/admin/media/${m.id}`, { method: "DELETE" });
                        toast.success("Deleted");
                        router.refresh();
                      } catch (err) { toast.error((err as Error).message); }
                    }}
                  />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
