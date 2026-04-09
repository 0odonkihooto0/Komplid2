import { GanttStagesView } from '@/components/objects/gpr/GanttStagesView';

export const dynamic = 'force-dynamic';

export default function GprStagesPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttStagesView objectId={params.objectId} />;
}
