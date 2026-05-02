'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectHero } from '@/components/portal/ProjectHero';
import { useGuestSession } from '@/components/guest/useGuestSession';

interface GuestProjectDetail {
  id: string;
  name: string;
  address: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  criticalDefectsCount?: number;
  progress: {
    totalDocs: number;
    signedDocs: number;
    percent: number;
  };
}

// Вкладки гостевого просмотра объекта
type TabKey = 'photos' | 'documents' | 'comments' | 'signatures';

interface Tab {
  key: TabKey;
  label: string;
}

export default function GuestProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { canViewPhotos, canViewDocuments, canComment, canSignActs } = useGuestSession();
  const [activeTab, setActiveTab] = useState<TabKey>('documents');

  // Загружаем детали объекта строительства
  const { data: project, isLoading, error } = useQuery<GuestProjectDetail>({
    queryKey: ['guest-project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/guest/projects/${projectId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!projectId,
  });

  // Формируем список доступных вкладок на основе прав гостя
  const tabs: Tab[] = [
    ...(canViewPhotos ? [{ key: 'photos' as const, label: 'Фото' }] : []),
    ...(canViewDocuments ? [{ key: 'documents' as const, label: 'Документы' }] : []),
    ...(canComment ? [{ key: 'comments' as const, label: 'Комментарии' }] : []),
    ...(canSignActs ? [{ key: 'signatures' as const, label: 'Подписи' }] : []),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Не удалось загрузить объект. Попробуйте обновить страницу.</p>
        <Link href="/guest">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Вернуться
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ссылка назад */}
      <Link href="/guest" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Все объекты
      </Link>

      {/* Баннер объекта */}
      <ProjectHero
        name={project.name}
        address={project.address ?? undefined}
        status={project.status}
        plannedStartDate={project.plannedStartDate ?? undefined}
        plannedEndDate={project.plannedEndDate ?? undefined}
        signedDocCount={project.progress.signedDocs}
        totalDocCount={project.progress.totalDocs}
        openDefectsCount={project.criticalDefectsCount ?? 0}
      />

      {/* Навигация по вкладкам */}
      {tabs.length > 0 && (
        <div className="border-b">
          <nav className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Содержимое вкладок — ссылки на sub-страницы */}
      <div>
        {activeTab === 'photos' && canViewPhotos && (
          <div className="text-sm text-muted-foreground">
            <Link href={`/guest/projects/${projectId}/photos`} className="text-primary underline">
              Открыть фотогалерею
            </Link>
          </div>
        )}
        {activeTab === 'documents' && canViewDocuments && (
          <div className="text-sm text-muted-foreground">
            <Link href={`/guest/projects/${projectId}/documents`} className="text-primary underline">
              Открыть список документов
            </Link>
          </div>
        )}
        {activeTab === 'comments' && canComment && (
          <div className="text-sm text-muted-foreground">
            <Link href={`/guest/projects/${projectId}/comments`} className="text-primary underline">
              Открыть комментарии
            </Link>
          </div>
        )}
        {activeTab === 'signatures' && canSignActs && (
          <div className="text-sm text-muted-foreground">
            <Link href="/guest/signatures" className="text-primary underline">
              История подписей
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
