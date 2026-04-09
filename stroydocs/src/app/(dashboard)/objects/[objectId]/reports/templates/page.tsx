import { TemplatesView } from '@/components/objects/reports/TemplatesView';

export const dynamic = 'force-dynamic';

interface Props {
  params: { objectId: string };
}

export default function ReportTemplatesPage({ params }: Props) {
  return <TemplatesView objectId={params.objectId} />;
}
