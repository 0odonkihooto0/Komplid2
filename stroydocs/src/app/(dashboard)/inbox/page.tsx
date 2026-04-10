import { PageHeader } from '@/components/shared/PageHeader';
import { InboxView } from '@/components/inbox/InboxView';

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Входящие"
        description="Документы, ожидающие вашего согласования или подписи"
      />
      <InboxView />
    </div>
  );
}
