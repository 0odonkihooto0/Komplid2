import { RemediationActCard } from '@/components/modules/objects/sk/RemediationActCard';

export const dynamic = 'force-dynamic';

// Строительный контроль — Детальная карточка акта устранения недостатков
export default function RemediationActDetailPage({
  params,
}: {
  params: { objectId: string; remediationActId: string };
}) {
  return <RemediationActCard objectId={params.objectId} actId={params.remediationActId} />;
}
