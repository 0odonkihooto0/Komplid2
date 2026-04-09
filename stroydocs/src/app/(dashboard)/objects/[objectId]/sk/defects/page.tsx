import { SkDefectsView } from '@/components/modules/objects/sk/SkDefectsView';

export const dynamic = 'force-dynamic';

// Строительный контроль — Недостатки (расширенная вкладка, шаг 6)
export default function SkDefectsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <SkDefectsView objectId={params.objectId} />;
}
