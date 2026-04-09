import { GanttCompareView } from '@/components/objects/gpr/GanttCompareView';

export const dynamic = 'force-dynamic';

export default function GprComparePage({ params }: { params: { objectId: string } }) {
  return <GanttCompareView objectId={params.objectId} />;
}
