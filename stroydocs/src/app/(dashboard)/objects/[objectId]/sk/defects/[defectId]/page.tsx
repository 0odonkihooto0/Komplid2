import { DefectDetailCard } from '@/components/modules/objects/sk/DefectDetailCard';

export const dynamic = 'force-dynamic';

// Строительный контроль — Детальная карточка недостатка (8 вкладок, шаг 6)
export default function DefectDetailPage({
  params,
}: {
  params: { objectId: string; defectId: string };
}) {
  return (
    <div className="p-6">
      <DefectDetailCard objectId={params.objectId} defectId={params.defectId} />
    </div>
  );
}
