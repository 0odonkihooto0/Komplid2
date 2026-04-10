import { LimitRisksView } from '@/components/objects/limit-risks/LimitRisksView';

export const dynamic = 'force-dynamic';

export default function InfoLimitRisksPage({ params }: { params: { objectId: string } }) {
  return <LimitRisksView projectId={params.objectId} />;
}
