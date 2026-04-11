import { PMVersionsView } from '@/components/modules/planner/PMVersionsView';

export const dynamic = 'force-dynamic';

export default function PMVersionsPage({ params }: { params: { objectId: string } }) {
  return <PMVersionsView projectId={params.objectId} />;
}
