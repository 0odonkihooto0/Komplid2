'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsTable } from '@/components/modules/projects/ProjectsTable';
import { CreateProjectDialog } from '@/components/modules/projects/CreateProjectDialog';

export function ProjectsContent() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Проекты"
        description="Объекты капитального строительства"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Новый проект
          </Button>
        }
      />
      <ProjectsTable />
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
