import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="flex flex-col gap-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-10 rounded-lg ${i % 3 === 0 ? 'w-2/3 self-end' : 'w-2/3'}`}
          />
        ))}
      </div>
    </div>
  );
}
