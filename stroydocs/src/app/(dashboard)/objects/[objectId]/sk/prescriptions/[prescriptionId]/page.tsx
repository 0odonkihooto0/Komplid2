import { PrescriptionCard } from '@/components/modules/objects/sk/PrescriptionCard';

export const dynamic = 'force-dynamic';

// Строительный контроль — Карточка предписания (Шаг 5)
export default function PrescriptionDetailPage({
  params,
}: {
  params: { objectId: string; prescriptionId: string };
}) {
  return (
    <PrescriptionCard
      objectId={params.objectId}
      prescriptionId={params.prescriptionId}
    />
  );
}
