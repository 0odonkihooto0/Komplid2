import { PrescriptionsView } from '@/components/modules/objects/sk/PrescriptionsView';

export const dynamic = 'force-dynamic';

// Строительный контроль — Предписания (Шаг 5)
export default function PrescriptionsPage({ params }: { params: { objectId: string } }) {
  return <PrescriptionsView objectId={params.objectId} />;
}
