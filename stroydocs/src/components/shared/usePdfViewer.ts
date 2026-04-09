'use client';

import { useState, useCallback } from 'react';

export function usePdfViewer() {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, numPages)));
  }, [numPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  }, [numPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const fitToWidth = useCallback(() => {
    setScale(1.0);
  }, []);

  return {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    fitToWidth,
  };
}
