import { Users, Wifi, WifiOff } from "lucide-react";
import { CopyButton } from "components/ui/copy-button";
import type { ServerStatus } from "lib/server-status";

export function ServerStatusWidget({ status, javaAddress, bedrockAddress, bedrockPort }: { status: ServerStatus; javaAddress: string; bedrockAddress: string; bedrockPort: number }) {
  if (!javaAddress && !bedrockAddress) return null;
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-surface/80 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Server status</span>
        {status.state === "online" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
            <span className="size-2 animate-pulse rounded-full bg-green-400" /> Online
          </span>
        ) : status.state === "offline" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <WifiOff className="size-3.5" /> Offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Wifi className="size-3.5" /> Status unavailable
          </span>
        )}
      </div>
      {status.state === "online" && (
        <p className="mb-3 flex items-center gap-2 text-sm">
          <Users className="size-4 text-secondary" />
          <span>
            <strong className="text-lg">{status.playersOnline}</strong>
            <span className="text-muted"> / {status.playersMax} players online</span>
          </span>
        </p>
      )}
      <div className="space-y-2">
        {javaAddress && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted">Java</p>
              <p className="truncate font-mono text-sm">{javaAddress}</p>
            </div>
            <CopyButton value={javaAddress} label="IP" size="sm" />
          </div>
        )}
        {bedrockAddress && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted">Bedrock (port {bedrockPort})</p>
              <p className="truncate font-mono text-sm">{bedrockAddress}</p>
            </div>
            <CopyButton value={bedrockAddress} label="address" size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
