import { VideoCamerasView } from '@/components/objects/info/video/VideoCamerasView';

export const dynamic = 'force-dynamic';

export default function InfoVideoPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <VideoCamerasView objectId={params.objectId} />;
}
