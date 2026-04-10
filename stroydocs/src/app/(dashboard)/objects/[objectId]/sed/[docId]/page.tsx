import { SEDDocumentCard } from '@/components/objects/sed/SEDDocumentCard';

export const dynamic = 'force-dynamic';

export default function SEDDocumentDetailPage({
  params,
}: {
  params: { objectId: string; docId: string };
}) {
  return <SEDDocumentCard objectId={params.objectId} docId={params.docId} />;
}
