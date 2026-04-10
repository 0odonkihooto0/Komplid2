import { ProblematicQuestionsView } from '@/components/objects/info/ProblematicQuestionsView';

export default function InfoQuestionsPage({ params }: { params: { objectId: string } }) {
  return <ProblematicQuestionsView objectId={params.objectId} />;
}
