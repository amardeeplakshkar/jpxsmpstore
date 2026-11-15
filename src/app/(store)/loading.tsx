import { CardGridSkeleton, Skeleton } from "components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-64" />
      <CardGridSkeleton />
    </div>
  );
}
