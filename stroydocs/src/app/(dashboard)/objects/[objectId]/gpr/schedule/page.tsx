import { GanttScheduleView } from '@/components/objects/gpr/GanttScheduleView';

export const dynamic = 'force-dynamic';

export default function GprSchedulePage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttScheduleView objectId={params.objectId} />;
}
