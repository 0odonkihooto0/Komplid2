import { Skeleton } from '@/components/ui/skeleton';

export default function InboxLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
