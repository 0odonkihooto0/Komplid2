export const dynamic = 'force-dynamic';

import { GanttVersionsView } from '@/components/objects/gpr/GanttVersionsView';

interface Props {
  params: { objectId: string };
}

export default function GprVersionsPage({ params }: Props) {
  return <GanttVersionsView objectId={params.objectId} />;
}
