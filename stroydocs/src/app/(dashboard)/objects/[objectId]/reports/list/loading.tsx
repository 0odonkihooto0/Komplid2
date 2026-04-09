import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex gap-4 p-6">
      <div className="w-60 space-y-2">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
