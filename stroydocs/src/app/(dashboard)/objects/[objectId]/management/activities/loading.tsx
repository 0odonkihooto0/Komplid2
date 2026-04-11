import { Skeleton } from '@/components/ui/skeleton';

export default function ActivitiesLoading() {
  return (
    <div className="flex h-[calc(100vh-200px)] overflow-hidden rounded-lg border bg-background">
      <div className="w-60 shrink-0 border-r p-4">
        <Skeleton className="mb-3 h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-1 h-8 w-full" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-2">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
