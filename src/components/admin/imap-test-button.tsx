"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { api } from "lib/client-api";

export function ImapTestButton({ values }: { values: Record<string, unknown> }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api<{ messages: number; unseen: number }>("/api/admin/settings/test-imap", {
            method: "POST",
            json: { host: values.host, port: Number(values.port), secure: Boolean(values.secure), username: values.username, password: values.password || undefined, mailbox: values.mailbox },
          });
          toast.success(`Connected. ${r.messages} messages, ${r.unseen} unread in ${String(values.mailbox)}.`);
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      Test connection
    </Button>
  );
}
