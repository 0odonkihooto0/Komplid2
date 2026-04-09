import { ChatView } from '@/components/objects/info/ChatView';

export const dynamic = 'force-dynamic';

export default function ChatPage({
  params,
}: {
  params: { objectId: string };
}) {
  return <ChatView objectId={params.objectId} />;
}
