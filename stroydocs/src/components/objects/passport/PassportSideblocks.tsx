'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  organization?: { name: string } | null;
  roles: { id: string; roleName: string }[];
}

interface PassportSideblocksProps {
  projectId: string;
  objectId: string;
  // ТЭП из паспорта
  area?: number | null;
  floors?: number | null;
  constructionType?: string | null;
  responsibilityClass?: string | null;
}

function InfoKV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-2 border-b last:border-0">
      <span className="w-1/2 text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right flex-1">
        {value != null && value !== '' ? value : <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

export function PassportSideblocks({ projectId, objectId, area, floors, constructionType, responsibilityClass }: PassportSideblocksProps) {
  const { data } = useQuery<{ persons: Person[] }>({
    queryKey: ['participants', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/participants`);
      const json = await res.json() as { success: boolean; data: { orgs: unknown[]; persons: Person[] } };
      if (!json.success) return { persons: [] };
      return { persons: json.data.persons };
    },
    staleTime: 5 * 60 * 1000,
  });

  const persons = data?.persons ?? [];

  return (
    <>
      {/* Участники · Ключевые люди */}
      <Card className="rounded-panel">
        <CardHeader className="pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">УЧАСТНИКИ</p>
            <CardTitle>Ключевые люди</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {persons.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Участники не добавлены</p>
              <Link
                href={`/objects/${objectId}/info/participants`}
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                Добавить участников →
              </Link>
            </div>
          ) : (
            persons.slice(0, 4).map((p) => {
              const fullName = `${p.lastName} ${p.firstName}${p.middleName ? ` ${p.middleName[0]}.` : ''}`;
              const role = p.roles[0]?.roleName;
              return (
                <div key={p.id} className="flex flex-col gap-0.5">
                  {role && (
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {role}
                    </p>
                  )}
                  <p className="text-sm font-medium leading-tight">{fullName}</p>
                  {p.organization?.name && (
                    <p className="text-xs text-muted-foreground">{p.organization.name}</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Показатели · Технико-экономические */}
      <Card className="rounded-panel">
        <CardHeader className="pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">ПОКАЗАТЕЛИ</p>
            <CardTitle>Технико-экономические</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoKV label="Тип строительства" value={constructionType} />
          <InfoKV label="Площадь" value={area != null ? `${area} м²` : null} />
          <InfoKV label="Этажность" value={floors} />
          <InfoKV label="Класс ответственности" value={responsibilityClass} />
        </CardContent>
      </Card>
    </>
  );
}
