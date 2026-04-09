import { ModelsView } from '@/components/modules/tim/ModelsView';

interface TimModelsPageProps {
  params: { objectId: string };
}

export default function TimModelsPage({ params }: TimModelsPageProps) {
  return <ModelsView objectId={params.objectId} />;
}
