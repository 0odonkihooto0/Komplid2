'use client';

import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { ViewerScene } from './ifcSceneSetup';

/** Хук экспорта: скачивание IFC-файла и скриншот canvas. */
export function useViewerExport(
  sceneRef: RefObject<ViewerScene | null>,
  downloadUrl: string,
) {
  const downloadIfc = useCallback(() => {
    window.open(downloadUrl, '_blank');
  }, [downloadUrl]);

  const screenshot = useCallback((format: 'png' | 'jpeg' = 'png') => {
    const s = sceneRef.current;
    if (!s) return;
    const a = document.createElement('a');
    a.href = s.renderer.domElement.toDataURL(`image/${format}`);
    a.download = `screenshot.${format === 'jpeg' ? 'jpg' : 'png'}`;
    a.click();
  }, [sceneRef]);

  return { downloadIfc, screenshot };
}
