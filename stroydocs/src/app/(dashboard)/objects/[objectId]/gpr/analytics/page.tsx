import { GanttAnalyticsView } from '@/components/objects/gpr/GanttAnalyticsView';

export const dynamic = 'force-dynamic';

export default function GprAnalyticsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttAnalyticsView objectId={params.objectId} />;
}
