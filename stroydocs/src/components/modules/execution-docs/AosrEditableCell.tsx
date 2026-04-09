'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, Pencil } from 'lucide-react';

interface Props {
  value: string;          // Текущее значение (override или DB)
  dbValue: string;        // Оригинальное значение из БД
  field: string;
  docId: string;
  onSave: (docId: string, field: string, value: string) => void;
  readonly?: boolean;
}

export function AosrEditableCell({ value, dbValue, field, docId, onSave, readonly }: Props) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasOverride = value !== dbValue && value !== '';

  // Синхронизация при внешнем изменении
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Авторазмер
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editing]);

  const handleCommit = useCallback(() => {
    setEditing(false);
    if (localValue !== value) {
      onSave(docId, field, localValue);
    }
  }, [docId, field, localValue, onSave, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        setLocalValue(value);
        setEditing(false);
      }
    },
    [handleCommit, value]
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSave(docId, field, '');
    },
    [docId, field, onSave]
  );

  const handleResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }, []);

  if (readonly) {
    return (
      <div className="px-2 py-1 text-sm whitespace-pre-wrap min-h-[2rem]">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    );
  }

  return (
    <div className="group relative min-h-[2rem]">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleResize}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full resize-none rounded border border-primary bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary whitespace-pre-wrap overflow-hidden"
          style={{ minHeight: '2rem' }}
        />
      ) : (
        <div
          className="flex cursor-text items-start gap-1 px-2 py-1 text-sm whitespace-pre-wrap hover:bg-accent/40 rounded transition-colors"
          onClick={() => setEditing(true)}
        >
          <span className="flex-1 min-h-[1.25rem]">
            {value || <span className="text-muted-foreground">—</span>}
          </span>
          {hasOverride && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="h-3 w-3 text-blue-500" aria-label="Значение переопределено" />
              <button
                type="button"
                onClick={handleReset}
                className="rounded p-0.5 hover:bg-muted"
                title="Сбросить к значению из БД"
              >
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
