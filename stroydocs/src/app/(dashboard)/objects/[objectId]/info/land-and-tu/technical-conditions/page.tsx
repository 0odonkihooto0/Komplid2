import { TechnicalConditionsView } from '@/components/modules/technical-conditions/TechnicalConditionsView';

export const dynamic = 'force-dynamic';

export default function TechnicalConditionsPage({ params }: { params: { objectId: string } }) {
  return <TechnicalConditionsView projectId={params.objectId} />;
}
