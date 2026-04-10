'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrgResult {
  id: string;
  name: string;
  inn: string;
}

interface Props {
  label: string;
  initialName?: string;
  onSelect: (orgId: string, orgName: string) => void;
}

/** Поиск организации с автодополнением */
export function OrgSearchInput({ label, initialName = '', onSelect }: Props) {
  const [query, setQuery] = useState(initialName);
  const [results, setResults] = useState<OrgResult[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return; }
    fetch(`/api/organizations/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults((d.data ?? []) as OrgResult[]))
      .catch(() => setResults([]));
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    setDropdownOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 300);
  };

  return (
    <div className="relative">
      <Label>{label}</Label>
      <Input
        className="mt-1"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
        placeholder="Введите название..."
      />
      {dropdownOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {results.map((org) => (
            <button
              key={org.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
              onMouseDown={() => {
                onSelect(org.id, org.name);
                setQuery(org.name);
                setDropdownOpen(false);
              }}
            >
              <span className="font-medium">{org.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">ИНН {org.inn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
