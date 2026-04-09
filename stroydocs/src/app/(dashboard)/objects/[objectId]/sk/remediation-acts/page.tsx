import { RemediationActsView } from '@/components/modules/objects/sk/RemediationActsView';

export const dynamic = 'force-dynamic';

// Строительный контроль — Акты устранения недостатков (Шаг 7 Модуля 11)
export default function RemediationActsPage({ params }: { params: { objectId: string } }) {
  return <RemediationActsView objectId={params.objectId} />;
}
