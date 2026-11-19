import { CardGridSkeleton, Skeleton } from "components/ui/skeleton";

/** Instant skeleton while admin pages stream in, so navigation feels immediate. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <CardGridSkeleton />
    </div>
  );
}
