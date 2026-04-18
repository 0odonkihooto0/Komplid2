'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface AuditUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface AuditItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId: string;
  changedFields: string[];
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  user: AuditUser;
}

interface AuditResponse {
  items: AuditItem[];
  nextCursor: string | null;
}

interface Props {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_CONFIG = {
  CREATE: { icon: Plus, color: 'text-green-600', label: 'создал', badge: 'Создание' },
  UPDATE: { icon: Pencil, color: 'text-blue-600', label: 'изменил', badge: 'Изменение' },
  DELETE: { icon: Trash2, color: 'text-red-600', label: 'удалил', badge: 'Удаление' },
} as const;

function AuditItemRow({ item }: { item: AuditItem }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[item.action];
  const Icon = cfg.icon;
  const fio = `${item.user.firstName} ${item.user.lastName}`;
  const relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ru });
  const exactTime = format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm:ss');

  return (
    <div className="border-b last:border-0 py-3 px-1">
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{fio}</span>
            <Badge variant="outline" className="text-xs px-1.5 py-0">{cfg.badge}</Badge>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-default">{relativeTime}</span>
                </TooltipTrigger>
                <TooltipContent>{exactTime}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {item.action === 'UPDATE' && item.changedFields.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Изменённые поля ({item.changedFields.length})
            </button>
          )}

          {expanded && item.action === 'UPDATE' && (
            <div className="mt-2 rounded border overflow-hidden text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-2 py-1 font-medium w-1/3">Поле</th>
                    <th className="text-left px-2 py-1 font-medium w-1/3">Было</th>
                    <th className="text-left px-2 py-1 font-medium w-1/3">Стало</th>
                  </tr>
                </thead>
                <tbody>
                  {item.changedFields.map((field) => (
                    <tr key={field} className="border-t">
                      <td className="px-2 py-1 font-mono text-muted-foreground">{field}</td>
                      <td className="px-2 py-1 break-all">
                        {item.oldValues?.[field] != null
                          ? String(item.oldValues[field])
                          : <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="px-2 py-1 break-all">
                        {item.newValues?.[field] != null
                          ? String(item.newValues[field])
                          : <span className="text-muted-foreground italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReferenceAuditPanel({ slug, open, onOpenChange }: Props) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<AuditItem[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const queryKey = ['ref-audit', slug, from, to];

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: [...queryKey, cursor],
    queryFn: async () => {
      const sp = new URLSearchParams({ limit: '20' });
      if (cursor) sp.set('cursor', cursor);
      if (from) sp.set('from', from);
      if (to) sp.set('to', to);
      const res = await fetch(`/api/references/${slug}/audit?${sp}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error as string);
      return json.data as AuditResponse;
    },
    enabled: open,
  });

  // При смене фильтров сбрасываем накопленные записи
  const handleFilterChange = () => {
    setCursor(null);
    setAllItems([]);
  };

  // Добавляем новые записи к накопленным при подгрузке
  const displayItems: AuditItem[] = cursor
    ? [...allItems, ...(data?.items ?? [])]
    : (data?.items ?? []);

  const handleLoadMore = () => {
    if (data?.nextCursor) {
      setAllItems(displayItems);
      setCursor(data.nextCursor);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle>История изменений</SheetTitle>
        </SheetHeader>

        {/* Фильтры по дате */}
        <div className="flex items-end gap-2 pt-2 pb-3 border-b">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">С</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); handleFilterChange(); }}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">По</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); handleFilterChange(); }}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFrom(''); setTo(''); handleFilterChange(); }}
              className="h-8 px-2 text-xs"
            >
              Сбросить
            </Button>
          )}
        </div>

        {/* Список записей */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && !cursor ? (
            <div className="space-y-4 py-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 px-1">
                  <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Нет записей
            </div>
          ) : (
            <div>
              {displayItems.map((item) => (
                <AuditItemRow key={item.id} item={item} />
              ))}
              {data?.nextCursor && (
                <div className="py-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
