'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getReferenceSchema } from '@/lib/references/registry';
import { CATEGORY_LABELS } from '@/lib/references/constants';
import { ReferenceEditDialog } from '@/components/references/ReferenceEditDialog';

function formatValue(value: unknown, type: string, options?: { value: string; label: string }[]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean') return value ? 'Да' : 'Нет';
  if (type === 'date' && typeof value === 'string') {
    try { return new Date(value).toLocaleDateString('ru-RU'); } catch { return String(value); }
  }
  if (type === 'select' && options) {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  return String(value);
}

export default function ReferenceEntryPage() {
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const schema = getReferenceSchema(params.slug);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['references', params.slug, params.id],
    queryFn: async () => {
      const res = await fetch(`/api/references/${params.slug}/${params.id}`);
      if (!res.ok) throw new Error('Запись не найдена');
      const json = await res.json();
      return (json as { data: Record<string, unknown> }).data;
    },
    enabled: !!schema,
  });

  if (!schema) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Справочник не найден
      </div>
    );
  }

  const visibleFields = schema.fields.filter((f) => !f.hidden);

  return (
    <div className="max-w-2xl space-y-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/references" className="hover:text-foreground transition-colors">
          Справочники
        </Link>
        <span>/</span>
        <span>{CATEGORY_LABELS[schema.category]}</span>
        <span>/</span>
        <Link
          href={`/references/${schema.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {schema.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isLoading ? '...' : String(data?.name ?? data?.id ?? params.id)}
        </span>
      </nav>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/references/${schema.slug}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Вернуться в справочник
        </Button>
        {data && (
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Редактировать
          </Button>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-1">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">Не удалось загрузить запись</p>
        )}

        {data && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {visibleFields.map((field) => (
              <div key={field.key} className="flex flex-col">
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="text-sm font-medium">
                  {field.type === 'color' && data[field.key] ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full border"
                        style={{ background: String(data[field.key]) }}
                      />
                      {String(data[field.key])}
                    </span>
                  ) : field.type === 'boolean' ? (
                    <Badge variant={data[field.key] ? 'default' : 'secondary'}>
                      {formatValue(data[field.key], field.type)}
                    </Badge>
                  ) : (
                    formatValue(data[field.key], field.type, field.options)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {data && (
        <ReferenceEditDialog
          schema={schema}
          entry={data}
          open={editOpen}
          onOpenChange={setEditOpen}
          queryKey={['references', params.slug, params.id]}
          onSuccess={() => {
            setEditOpen(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
