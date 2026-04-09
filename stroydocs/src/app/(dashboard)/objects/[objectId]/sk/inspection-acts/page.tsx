import { InspectionActsView } from '@/components/modules/objects/sk/InspectionActsView';

export const dynamic = 'force-dynamic';

// Строительный контроль — Акты проверки (Шаг 5)
export default function InspectionActsPage({ params }: { params: { objectId: string } }) {
  return <InspectionActsView objectId={params.objectId} />;
}
