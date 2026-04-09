'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ThematicFilters } from './useThematicReport'

interface Props {
  filters: ThematicFilters
  onChange: <K extends keyof ThematicFilters>(key: K, value: ThematicFilters[K]) => void
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Весь период' },
  { value: 'year', label: 'За год' },
  { value: 'month', label: 'За месяц' },
  { value: 'week', label: 'За неделю' },
  { value: 'custom', label: 'Другое' },
] as const

export function ThematicFilters({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(v => !v)}>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-label="Раскрыть фильтры"
        />
        Фильтры
      </Button>
      {open && (
        <div className="absolute z-10 mt-1 p-4 border rounded-lg bg-white shadow-md space-y-4 min-w-[320px]">
          {/* Период */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Период</Label>
            <RadioGroup
              value={filters.period}
              onValueChange={(v) => onChange('period', v as ThematicFilters['period'])}
              className="flex flex-wrap gap-4"
            >
              {PERIOD_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`period-${opt.value}`} />
                  <Label htmlFor={`period-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          {/* Произвольный диапазон */}
          {filters.period === 'custom' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-sm mb-1 block">Начало</Label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={filters.dateFrom?.slice(0, 10) ?? ''}
                  onChange={e => onChange('dateFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm mb-1 block">Конец</Label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={filters.dateTo?.slice(0, 10) ?? ''}
                  onChange={e => onChange('dateTo', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                />
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        </div>
      )}
    </div>
  )
}
