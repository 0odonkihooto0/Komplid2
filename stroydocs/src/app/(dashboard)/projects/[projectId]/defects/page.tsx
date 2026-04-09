import { DefectsContent } from './DefectsContent';

export const dynamic = 'force-dynamic';

interface Props {
  params: { projectId: string };
}

export default function DefectsPage({ params }: Props) {
  return <DefectsContent projectId={params.projectId} />;
}
