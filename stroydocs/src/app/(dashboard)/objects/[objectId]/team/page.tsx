import type { ReactNode } from 'react';
import { ProjectTeamTab } from '@/components/project/ProjectTeamTab';

export const dynamic = 'force-dynamic';

export default function TeamPage({
  params,
}: {
  params: { objectId: string };
}): ReactNode {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Команда проекта</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Управление доступом участников к этому объекту строительства
        </p>
      </div>
      <ProjectTeamTab objectId={params.objectId} />
    </div>
  );
}
