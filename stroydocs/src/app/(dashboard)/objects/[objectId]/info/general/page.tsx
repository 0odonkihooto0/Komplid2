import { PassportView } from '@/components/objects/passport/PassportView';

export const dynamic = 'force-dynamic';

export default function InfoGeneralPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PassportView projectId={params.objectId} />;
}
