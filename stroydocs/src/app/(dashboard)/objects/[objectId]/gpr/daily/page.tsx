import { GanttDailyView } from '@/components/objects/gpr/GanttDailyView';

export const dynamic = 'force-dynamic';

export default function GprDailyPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttDailyView objectId={params.objectId} />;
}
