import { DocumentsView } from '@/components/objects/management/DocumentsView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { objectId: string };
}

export default function ManagementDocumentsPage({ params }: Props) {
  return <DocumentsView objectId={params.objectId} />;
}
