import { GanttStructureView } from '@/components/objects/gpr/GanttStructureView';

export const dynamic = 'force-dynamic';

export default function GprStructurePage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttStructureView objectId={params.objectId} />;
}
