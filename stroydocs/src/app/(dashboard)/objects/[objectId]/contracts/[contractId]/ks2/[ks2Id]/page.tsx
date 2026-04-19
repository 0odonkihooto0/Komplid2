import { Ks2DetailContent } from '@/components/modules/ks2/Ks2DetailContent';

interface Props {
  params: { objectId: string; contractId: string; ks2Id: string };
}

export default function Ks2DetailPage({ params }: Props) {
  return (
    <main className="container mx-auto py-6">
      <Ks2DetailContent
        projectId={params.objectId}
        contractId={params.contractId}
        ks2Id={params.ks2Id}
      />
    </main>
  );
}
