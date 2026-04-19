import { GanttContent } from '@/components/modules/gantt/GanttContent';

export const dynamic = 'force-dynamic';

interface Props {
  params: { projectId: string; contractId: string };
}

export default function GanttPage({ params }: Props) {
  return <GanttContent projectId={params.projectId} contractId={params.contractId} />;
}
