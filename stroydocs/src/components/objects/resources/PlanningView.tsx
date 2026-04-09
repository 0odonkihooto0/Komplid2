'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LrvSection } from './LrvSection';
import { LrvWizard } from './LrvWizard';
import { GprMaterialsPanel } from './GprMaterialsPanel';

// ─── Разделы левой панели ─────────────────────────────────────────────────────

type SectionId = 'lrv' | 'materials' | 'machines' | 'works';

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'lrv', label: 'Лимитно-разделительные ведомости' },
  { id: 'materials', label: 'Материалы' },
  { id: 'machines', label: 'Машины и механизмы' },
  { id: 'works', label: 'Работы' },
];

// ─── Компонент ────────────────────────────────────────────────────────────────

interface PlanningViewProps {
  objectId: string;
}

export function PlanningView({ objectId }: PlanningViewProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('lrv');
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Левая панель — навигация по разделам */}
      <nav className="w-56 shrink-0">
        <ul className="space-y-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { setActiveSection(s.id); setWizardOpen(false); }}
                className={cn(
                  'w-full text-left text-sm px-3 py-2 rounded-md transition-colors',
                  activeSection === s.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Правая панель — содержимое раздела */}
      <div className="flex-1 min-w-0">
        {activeSection === 'lrv' && !wizardOpen && (
          <LrvSection
            objectId={objectId}
            onOpenWizard={() => setWizardOpen(true)}
          />
        )}

        {activeSection === 'lrv' && wizardOpen && (
          <LrvWizard
            objectId={objectId}
            onClose={() => setWizardOpen(false)}
          />
        )}

        {activeSection === 'materials' && (
          <GprMaterialsPanel objectId={objectId} />
        )}

        {(activeSection === 'machines' || activeSection === 'works') && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              Раздел «{SECTIONS.find((s) => s.id === activeSection)?.label}» в разработке
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
