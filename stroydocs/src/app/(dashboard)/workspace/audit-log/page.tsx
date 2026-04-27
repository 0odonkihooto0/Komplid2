import { AuditLogPageContent } from './AuditLogPageContent';

export const metadata = {
  title: 'Журнал аудита — StroyDocs',
};

export default function AuditLogPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Журнал аудита</h1>
        <p className="text-muted-foreground text-sm mt-1">
          История всех значимых действий в вашем рабочем пространстве
        </p>
      </div>
      <AuditLogPageContent />
    </div>
  );
}
