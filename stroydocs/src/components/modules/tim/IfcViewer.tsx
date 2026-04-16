'use client';

/**
 * IfcViewer — публичный экспорт с ssr:false.
 * Three.js не работает в SSR — используем dynamic import.
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ViewerScene } from './ifcSceneSetup';

interface Props {
  /** ID объекта строительства (используется для запроса /glb-url) */
  projectId: string;
  /** ID BIM-модели (используется для запроса /glb-url) */
  modelId: string;
  /** Presigned URL для скачивания исходного IFC-файла (кнопка Download) */
  downloadUrl: string;
  elementColors?: Map<string, string>;
  onElementSelected: (ifcGuid: string | null) => void;
  onSceneReady?: (scene: ViewerScene) => void;
  onCollisions?: () => void;
  onCompare?: () => void;
  collisionsActive?: boolean;
  compareActive?: boolean;
  /** Экспорт элементов в CSV (ifcType — фильтр, undefined = все) */
  onExportCsv?: (ifcType?: string) => void;
}

const IfcViewerCore = dynamic(
  () => import('./IfcViewerCore').then(m => m.IfcViewerCore),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Инициализация вьюера...</span>
      </div>
    ),
  }
);

export function IfcViewer(props: Props) {
  return <IfcViewerCore {...props} />;
}
