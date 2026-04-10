import { LandPlotsView } from '@/components/modules/land-plots/LandPlotsView';

export const dynamic = 'force-dynamic';

export default function LandPlotsPage({ params }: { params: { objectId: string } }) {
  return <LandPlotsView projectId={params.objectId} />;
}
