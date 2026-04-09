'use client'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/useToast'

export interface ThematicConfig {
  id: string
  slug: string
  name: string
  category: string
  availableColumns: Array<{ key: string; label: string }>
  defaultColumns: string[]
  dataSource: string
}

export interface ThematicFilters {
  period: 'all' | 'year' | 'month' | 'week' | 'custom'
  dateFrom?: string
  dateTo?: string
  contractId?: string
}

export interface ThematicRow {
  [key: string]: string | number | boolean | null
}

export function useThematicReport(objectId: string, slug: string) {
  // Загрузка конфига тематического отчёта
  const { data: config, isLoading: isConfigLoading } = useQuery<ThematicConfig>({
    queryKey: ['thematic-config', slug],
    queryFn: async () => {
      const res = await fetch(`/api/reports/thematic/${slug}`)
      if (!res.ok) throw new Error('Конфиг не найден')
      const json = await res.json() as { data: ThematicConfig }
      return json.data
    },
  })

  const { toast } = useToast()

  const [filters, setFilters] = useState<ThematicFilters>({ period: 'all' })
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(config?.defaultColumns ?? [])
  )
  const [rows, setRows] = useState<ThematicRow[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Обновить фильтры
  const updateFilter = useCallback(<K extends keyof ThematicFilters>(
    key: K,
    value: ThematicFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Переключить колонку
  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Выбрать все колонки
  const selectAllColumns = useCallback(() => {
    if (!config) return
    setSelectedColumns(new Set(config.availableColumns.map(c => c.key)))
  }, [config])

  // Снять все колонки
  const clearAllColumns = useCallback(() => {
    setSelectedColumns(new Set())
  }, [])

  // Вычислить диапазон дат из периода
  const getDateRange = useCallback((): { dateFrom?: string; dateTo?: string } => {
    const now = new Date()
    if (filters.period === 'all') return {}
    if (filters.period === 'custom') {
      return { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
    }
    const from = new Date(now)
    if (filters.period === 'year') from.setFullYear(now.getFullYear() - 1)
    else if (filters.period === 'month') from.setMonth(now.getMonth() - 1)
    else if (filters.period === 'week') from.setDate(now.getDate() - 7)
    return {
      dateFrom: from.toISOString(),
      dateTo: now.toISOString(),
    }
  }, [filters])

  // Сформировать отчёт — получить данные в таблицу
  const generate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/reports/thematic/${slug}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: objectId,
          filters: { ...getDateRange(), contractId: filters.contractId },
        }),
      })
      if (!res.ok) throw new Error('Ошибка формирования отчёта')
      const json = await res.json() as { data: { rows: ThematicRow[]; total: number } }
      setRows(json.data.rows ?? [])
      toast({ title: `Найдено записей: ${json.data.total ?? 0}` })
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сформировать отчёт', variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }, [slug, objectId, getDateRange, filters.contractId])

  // Скачать XLSX
  const downloadXlsx = useCallback(async () => {
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/reports/thematic/${slug}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: objectId,
          filters: { ...getDateRange(), contractId: filters.contractId },
        }),
      })
      if (!res.ok) throw new Error('Ошибка генерации файла')
      const json = await res.json() as { data: { url: string } }
      // Открываем presigned URL в новой вкладке для скачивания
      window.open(json.data.url, '_blank')
      toast({ title: 'Файл готов к скачиванию' })
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сгенерировать XLSX', variant: 'destructive' })
    } finally {
      setIsDownloading(false)
    }
  }, [slug, objectId, getDateRange, filters.contractId])

  return {
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
  }
}
