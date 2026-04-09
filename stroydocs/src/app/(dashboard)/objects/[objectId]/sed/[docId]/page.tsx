import { SEDDocumentDetail } from '@/components/objects/sed/SEDDocumentDetail';

export const dynamic = 'force-dynamic';

export default function SEDDocumentDetailPage({
  params,
}: {
  params: { objectId: string; docId: string };
}) {
  return <SEDDocumentDetail objectId={params.objectId} docId={params.docId} />;
}
