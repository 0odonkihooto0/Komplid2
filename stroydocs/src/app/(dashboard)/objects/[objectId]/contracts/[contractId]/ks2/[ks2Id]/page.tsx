import { Ks2DetailContent } from '@/components/modules/ks2/Ks2DetailContent';

export default function ObjectKs2DetailPage({
  params,
}: {
  params: { objectId: string; contractId: string; ks2Id: string };
}) {
  return (
    <Ks2DetailContent
      projectId={params.objectId}
      contractId={params.contractId}
      ks2Id={params.ks2Id}
    />
  );
}
