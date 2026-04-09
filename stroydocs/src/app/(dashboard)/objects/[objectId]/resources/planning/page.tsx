export const dynamic = 'force-dynamic';

import { PlanningView } from '@/components/objects/resources/PlanningView';

export default function ResourcesPlanningPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PlanningView objectId={params.objectId} />;
}
