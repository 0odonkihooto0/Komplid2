'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObjectItem {
  id: string;
  name: string;
}

export function SidebarProjectsList() {
  const pathname = usePathname();

  const { data: objects } = useQuery<ObjectItem[]>({
    // Дедупликация с ObjectsTable через тот же queryKey
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/objects');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    // Показываем только первые 5 в сайдбаре
    select: (data) => data.slice(0, 5),
  });

  if (!objects?.length) return null;

  return (
    <div className="px-2">
      <p className="mb-1 px-3 text-xs font-medium text-white/50 uppercase">
        Объекты
      </p>
      <div className="space-y-0.5">
        {objects.map((obj) => {
          const isActive = pathname.startsWith(`/objects/${obj.id}`);
          return (
            <Link
              key={obj.id}
              href={`/objects/${obj.id}/passport`}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-blue-600/30 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{obj.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
