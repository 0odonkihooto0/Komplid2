import { IndicatorsView } from '@/components/objects/indicators/IndicatorsView';

export const dynamic = 'force-dynamic';

export default function InfoIndicatorsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <IndicatorsView projectId={params.objectId} />;
}
