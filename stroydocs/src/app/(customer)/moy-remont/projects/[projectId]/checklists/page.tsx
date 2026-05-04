export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CustomerChecklistCard from '@/components/customer/CustomerChecklistCard';

interface Props {
  params: { projectId: string };
}

async function fetchChecklists(projectId: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/customer/projects/${projectId}/checklists`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export default async function ChecklistsPage({ params }: Props) {
  const checklists = await fetchChecklists(params.projectId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/moy-remont/projects/${params.projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-semibold">Чек-листы скрытых работ</h1>
        </div>
      </div>

      {checklists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Чек-листы ещё не добавлены.</p>
          <p className="text-sm mt-1">Чек-листы создаются по шаблонам видов скрытых работ.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {checklists.map((checklist: any) => (
            <CustomerChecklistCard key={checklist.id} checklist={checklist} />
          ))}
        </div>
      )}
    </div>
  );
}
