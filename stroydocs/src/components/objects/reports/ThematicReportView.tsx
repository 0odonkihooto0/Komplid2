'use client'
import { FileSpreadsheet, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useThematicReport } from './useThematicReport'
import { ThematicFilters } from './ThematicFilters'
import { ThematicSettings } from './ThematicSettings'
import { ThematicResultsTable } from './ThematicResultsTable'

interface Props {
  objectId: string
  slug: string
}

export function ThematicReportView({ objectId, slug }: Props) {
  const {
    config,
    isConfigLoading,
    filters,
    updateFilter,
    selectedColumns,
    toggleColumn,
    selectAllColumns,
    clearAllColumns,
    rows,
    isGenerating,
    isDownloading,
    generate,
    downloadXlsx,
  } = useThematicReport(objectId, slug)

  if (isConfigLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Тематический отчёт не найден
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Заголовок и кнопки действий */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">{config.name}</h2>
        <div className="flex items-center gap-2 relative">
          <ThematicFilters filters={filters} onChange={updateFilter} />
          <ThematicSettings
            availableColumns={config.availableColumns}
            selectedColumns={selectedColumns}
            onToggle={toggleColumn}
            onSelectAll={selectAllColumns}
            onClearAll={clearAllColumns}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={downloadXlsx}
            disabled={isDownloading}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" aria-label="Скачать XLSX" />
            {isDownloading ? 'Генерация...' : 'Печать'}
          </Button>
          <Button
            size="sm"
            onClick={generate}
            disabled={isGenerating}
            className="gap-2"
          >
            <Play className="h-4 w-4" aria-label="Сформировать отчёт" />
            {isGenerating ? 'Формирование...' : 'Сформировать'}
          </Button>
        </div>
      </div>

      {/* Таблица результатов */}
      <ThematicResultsTable
        rows={rows}
        availableColumns={config.availableColumns}
        selectedColumns={selectedColumns}
        isLoading={isGenerating}
      />
    </div>
  )
}
