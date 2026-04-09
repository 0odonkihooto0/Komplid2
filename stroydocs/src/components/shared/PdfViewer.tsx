'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePdfViewer } from './usePdfViewer';

// Настройка worker для react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  onPageClick?: (page: number, x: number, y: number) => void;
}

export function PdfViewer({ url, onPageClick }: PdfViewerProps) {
  const {
    numPages,
    currentPage,
    scale,
    onDocumentLoadSuccess,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    fitToWidth,
  } = usePdfViewer();

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onPageClick(currentPage, x, y);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Панель управления */}
      <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
        <Button variant="ghost" size="icon" onClick={prevPage} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[80px] text-center text-sm">
          {currentPage} / {numPages}
        </span>
        <Button variant="ghost" size="icon" onClick={nextPage} disabled={currentPage >= numPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={fitToWidth} title="По ширине">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Документ */}
      <div
        className="overflow-auto rounded-md border bg-white"
        style={{ maxHeight: '70vh' }}
        onClick={handlePageClick}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<Skeleton className="h-[800px] w-[600px]" />}
          error={
            <div className="flex h-[400px] w-[600px] items-center justify-center text-muted-foreground">
              Ошибка загрузки PDF
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            loading={<Skeleton className="h-[800px] w-[600px]" />}
          />
        </Document>
      </div>
    </div>
  );
}
