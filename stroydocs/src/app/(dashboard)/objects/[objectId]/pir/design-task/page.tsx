'use client';

import { DesignTaskList } from '@/components/objects/pir/DesignTaskList';

export const dynamic = 'force-dynamic';

export default function PIRDesignTaskPage({
  params,
}: {
  params: { objectId: string };
}) {
  // objectId === projectId: BuildingObject.id используется как projectId во всех API
  return <DesignTaskList objectId={params.objectId} projectId={params.objectId} />;
}
