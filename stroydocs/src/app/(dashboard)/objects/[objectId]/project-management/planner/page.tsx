import { ProjectPlannerView } from '@/components/modules/planner/ProjectPlannerView';

export const dynamic = 'force-dynamic';

export default function PlannerPage({ params }: { params: { objectId: string } }) {
  return <ProjectPlannerView projectId={params.objectId} />;
}
