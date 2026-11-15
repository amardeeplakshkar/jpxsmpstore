import { Badge } from "components/ui/badge";

type V = "default" | "secondary" | "gold" | "success" | "warning" | "danger" | "muted";
const map: Record<string, V> = {
  PENDING: "muted",
  VERIFYING: "secondary",
  MATCHED: "default",
  PAID: "success",
  REJECTED: "danger",
  EXPIRED: "muted",
  REFUNDED: "warning",
  PROCESSING: "secondary",
  FULFILLED: "success",
  FAILED: "danger",
  CANCELLED: "danger",
  APPROVED: "success",
  UNMATCHED: "warning",
  AMBIGUOUS: "warning",
  DUPLICATE: "danger",
  UNTRUSTED: "danger",
  PARSE_FAILED: "muted",
  IGNORED: "muted",
  ACTIVE: "success",
  BLOCKED: "danger",
};

const labels: Record<string, string> = { PARSE_FAILED: "Not parsed" };

export function StatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const label = labels[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <Badge variant={map[status] ?? "muted"}>
      {prefix ? `${prefix}: ` : ""}
      {label}
    </Badge>
  );
}
