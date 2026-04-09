import { EstimateCompareView } from '@/components/objects/estimates/EstimateCompareView';

export default function EstimateComparePage({ params }: { params: { objectId: string } }) {
  return <EstimateCompareView objectId={params.objectId} />;
}
