import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentsPageContent } from './DocumentsPageContent';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Документы"
        description="Глобальный архив документации по всем проектам организации"
      />
      <DocumentsPageContent />
    </div>
  );
}
