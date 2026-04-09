import { DesignDocList } from '@/components/objects/pir/DesignDocList';

export const dynamic = 'force-dynamic';

export default function PIRReusePage({
  params,
}: {
  params: { objectId: string };
}) {
  return (
    <DesignDocList
      objectId={params.objectId}
      projectId={params.objectId}
      fixedDocType="REPEATED_USE"
      showCopyButton
    />
  );
}
