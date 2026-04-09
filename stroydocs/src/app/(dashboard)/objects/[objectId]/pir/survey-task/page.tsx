'use client';

import { SurveyTaskList } from '@/components/objects/pir/SurveyTaskList';

export const dynamic = 'force-dynamic';

export default function PIRSurveyTaskPage({
  params,
}: {
  params: { objectId: string };
}) {
  // objectId === projectId: BuildingObject.id используется как projectId во всех API
  return <SurveyTaskList objectId={params.objectId} projectId={params.objectId} />;
}
