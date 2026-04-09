import { EstimateContractView } from '@/components/objects/estimates/EstimateContractView';

export default function EstimateContractPage({ params }: { params: { objectId: string } }) {
  return <EstimateContractView objectId={params.objectId} />;
}
