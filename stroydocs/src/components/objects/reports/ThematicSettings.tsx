'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface ColumnDef {
  key: string
  label: string
}

interface Props {
  availableColumns: ColumnDef[]
  selectedColumns: Set<string>
  onToggle: (key: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function ThematicSettings({ availableColumns, selectedColumns, onToggle, onSelectAll, onClearAll }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(v => !v)}>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-label="Раскрыть настройки"
        />
        Настройки
      </Button>
      {open && (
        <div className="absolute z-10 mt-1 p-4 border rounded-lg bg-white shadow-md min-w-[360px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Отображаемые колонки</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onSelectAll}>Выбрать все</Button>
              <Button variant="ghost" size="sm" onClick={onClearAll}>Снять выделение</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {availableColumns.map(col => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={selectedColumns.has(col.key)}
                  onCheckedChange={() => onToggle(col.key)}
                />
                <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{col.label}</Label>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        </div>
      )}
    </div>
  )
}
