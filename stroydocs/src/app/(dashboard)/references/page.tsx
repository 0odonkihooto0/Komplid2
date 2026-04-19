'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, Wallet, Ruler, Languages, Handshake, FileType2,
  Receipt, CheckSquare, AlertTriangle, HelpCircle, Library,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listReferenceSchemas } from '@/lib/references/registry';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/references/constants';
import type { ReferenceSchema } from '@/lib/references/types';

const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  Wallet,
  Ruler,
  Languages,
  Handshake,
  FileType2,
  Receipt,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  Library,
};

async function fetchCount(slug: string): Promise<number> {
  const res = await fetch(`/api/references/${slug}?count=true`);
  if (!res.ok) return 0;
  const json = await res.json();
  return (json as { data?: { count?: number } }).data?.count ?? 0;
}

function ReferenceCard({ schema }: { schema: ReferenceSchema }) {
  const router = useRouter();
  const { data: count } = useQuery({
    queryKey: ['references', schema.slug, 'count'],
    queryFn: () => fetchCount(schema.slug),
    staleTime: 60_000,
  });

  const IconComponent = (schema.icon && ICON_MAP[schema.icon]) ? ICON_MAP[schema.icon] : Library;

  return (
    <Card
      className="hover:shadow-md cursor-pointer transition-shadow"
      onClick={() => router.push(`/references/${schema.slug}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-md bg-primary/10">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">{schema.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {schema.description && (
          <p className="text-xs text-muted-foreground mb-2">{schema.description}</p>
        )}
        <Badge variant="secondary">{count ?? '—'} записей</Badge>
      </CardContent>
    </Card>
  );
}

export default function ReferencesPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [scopeTab, setScopeTab] = useState<'all' | 'system'>('all');

  const isAdmin = session?.user?.role === 'ADMIN';
  const allSchemas = listReferenceSchemas();

  const filteredSchemas = allSchemas.filter((s) => {
    if (!isAdmin && s.adminOnly) return false;
    if (scopeTab === 'system' && s.scope !== 'system') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Library className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Справочники</h1>
          <p className="text-sm text-muted-foreground">Управление классификаторами системы</p>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Input
          placeholder="Поиск по справочникам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {isAdmin && (
          <Tabs value={scopeTab} onValueChange={(v) => setScopeTab(v as 'all' | 'system')}>
            <TabsList>
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="system">Системные</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {Array.from(CATEGORY_ORDER).map((cat) => {
        const schemas = filteredSchemas.filter((s) => s.category === cat);
        if (!schemas.length) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {schemas.map((s) => (
                <ReferenceCard key={s.slug} schema={s} />
              ))}
            </div>
          </section>
        );
      })}

      {filteredSchemas.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Справочники не найдены
        </p>
      )}
    </div>
  );
}
