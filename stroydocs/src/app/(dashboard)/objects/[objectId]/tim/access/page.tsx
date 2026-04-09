import { BimAccessSettings } from '@/components/modules/tim/BimAccessSettings';

interface Props {
  params: { objectId: string };
}

export default function TimAccessPage({ params }: Props) {
  return <BimAccessSettings projectId={params.objectId} />;
}
