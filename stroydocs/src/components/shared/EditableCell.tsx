'use client';

import { useState } from 'react';

interface Props {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'number' | 'date';
}

export function EditableCell({ value, onSave, type = 'text' }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 min-w-[60px] inline-block"
        onClick={() => setEditing(true)}
        title="Нажмите для редактирования"
      >
        {val || '—'}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={val}
      className="border rounded px-1 py-0.5 text-sm w-full"
      onChange={(e) => setVal(e.target.value)}
      onBlur={async () => {
        await onSave(val);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setVal(value);
          setEditing(false);
        }
      }}
    />
  );
}
