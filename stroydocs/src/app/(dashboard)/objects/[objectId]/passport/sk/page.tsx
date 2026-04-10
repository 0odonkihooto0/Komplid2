import { PassportSkView } from '@/components/objects/passport/PassportSkView';

export const dynamic = 'force-dynamic';

export default function PassportSkPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <PassportSkView projectId={params.objectId} />;
}
