'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  name: string;
  value: string;
  onChange: (v: string) => void;
  projectId: string;
  disabled?: boolean;
  id?: string;
}

/** Поле с автодополнением — при фокусе загружает сохранённые значения из API,
 *  при Enter сохраняет текущее значение для будущего использования.
 */
export function SavedFieldInput({ name, value, onChange, projectId, disabled, id }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/saved-field-values?field=${encodeURIComponent(name)}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSuggestions(json.data);
        setOpen(true);
      }
    } catch {
      // Не блокируем работу при ошибке подсказок
    }
  };

  const saveValue = async (v: string) => {
    if (!v.trim() || !projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/saved-field-values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName: name, value: v.trim() }),
      });
    } catch {
      // Не блокируем работу при ошибке сохранения
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={fetchSuggestions}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveValue(value);
            setOpen(false);
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md text-sm">
          {suggestions.map((s) => (
            <li
              key={s}
              className="px-3 py-1.5 cursor-pointer hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                saveValue(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
