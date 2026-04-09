'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates } from './useTemplates';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';

interface TemplatesViewProps {
  objectId: string;
}

export function TemplatesView({ objectId: _objectId }: TemplatesViewProps) {
  const {
    systemTemplates,
    orgTemplates,
    templatesLoading,
    createOpen,
    setCreateOpen,
    saveAsOpen,
    setSaveAsOpen,
    saveAsBlocks,
    saveAsDefaultName,
    createTemplate,
    deleteTemplate,
  } = useTemplates();

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Шаблоны отчётов</h2>
          <p className="text-sm text-muted-foreground">
            Системные наборы блоков и пользовательские шаблоны организации
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Создать шаблон
        </Button>
      </div>

      {/* Системные шаблоны */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Системные шаблоны
        </h3>
        {systemTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Системные шаблоны не найдены</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">Системный</Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  {tmpl.blockDefinitions.length} блоков
                  {tmpl._count.reports > 0 && ` · используется в ${tmpl._count.reports} отч.`}
                </div>

                {/* Список блоков */}
                <ul className="space-y-0.5">
                  {tmpl.blockDefinitions.slice(0, 4).map((b, i) => (
                    <li key={i} className="text-xs text-muted-foreground truncate">
                      {b.order + 1}. {b.title}
                    </li>
                  ))}
                  {tmpl.blockDefinitions.length > 4 && (
                    <li className="text-xs text-muted-foreground">
                      …ещё {tmpl.blockDefinitions.length - 4}
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Шаблоны организации */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Шаблоны организации
        </h3>
        {orgTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              У вашей организации нет пользовательских шаблонов
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreateOpen(true)}
            >
              Создать первый шаблон
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{tmpl.name}</p>
                    {tmpl.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {tmpl.blockDefinitions.length} блоков
                  {tmpl._count.reports > 0 && ` · используется в ${tmpl._count.reports} отч.`}
                </div>

                {/* Список блоков */}
                <ul className="space-y-0.5">
                  {tmpl.blockDefinitions.slice(0, 4).map((b, i) => (
                    <li key={i} className="text-xs text-muted-foreground truncate">
                      {b.order + 1}. {b.title}
                    </li>
                  ))}
                  {tmpl.blockDefinitions.length > 4 && (
                    <li className="text-xs text-muted-foreground">
                      …ещё {tmpl.blockDefinitions.length - 4}
                    </li>
                  )}
                </ul>

                {/* Действия */}
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs h-7"
                    onClick={() => deleteTemplate.mutate(tmpl.id)}
                    disabled={deleteTemplate.isPending}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Диалог создания шаблона */}
      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(payload) => createTemplate.mutate(payload)}
        isPending={createTemplate.isPending}
      />

      {/* Диалог «Сохранить как шаблон» (открывается из ReportCard) */}
      <SaveAsTemplateDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        blocks={saveAsBlocks}
        defaultName={saveAsDefaultName}
        onSubmit={(payload) => createTemplate.mutate(payload)}
        isPending={createTemplate.isPending}
      />
    </div>
  );
}
