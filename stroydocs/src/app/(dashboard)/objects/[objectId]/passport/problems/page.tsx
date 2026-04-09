import { ProblemsView } from '@/components/objects/passport/ProblemsView';

export const dynamic = 'force-dynamic';

export default function PassportProblemsPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ProblemsView projectId={params.objectId} />;
}
