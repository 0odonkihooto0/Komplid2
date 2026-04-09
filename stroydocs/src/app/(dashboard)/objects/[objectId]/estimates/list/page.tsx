import { EstimateListView } from '@/components/objects/estimates/EstimateListView';

export default function EstimateListPage({ params }: { params: { objectId: string } }) {
  return <EstimateListView objectId={params.objectId} />;
}
