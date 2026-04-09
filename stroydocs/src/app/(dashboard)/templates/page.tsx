import { BookOpen } from 'lucide-react';
import { TemplateCatalog } from '@/components/modules/templates/TemplateCatalog';

// Страница динамическая: содержит клиентские компоненты с mammoth.js (docx preview)
export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Справочник шаблонов документов</h1>
          <p className="text-sm text-muted-foreground">
            Скачайте шаблон .docx для заполнения в Word / LibreOffice или используйте автозаполнение
          </p>
        </div>
      </div>
      <TemplateCatalog />
    </div>
  );
}
