import { GanttMasteringView } from '@/components/objects/gpr/GanttMasteringView';

export const dynamic = 'force-dynamic';

export default function GprMasteringPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <GanttMasteringView objectId={params.objectId} />;
}
