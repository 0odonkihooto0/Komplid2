import { Skeleton } from '@/components/ui/skeleton';

export default function ReportCardLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
