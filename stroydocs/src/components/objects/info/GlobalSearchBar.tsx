'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, HelpCircle, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type SearchResultType = 'correspondence' | 'rfi' | 'sed';

interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
}

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: ReactNode; color: string; path: string }
> = {
  correspondence: {
    label: 'Переписка',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: 'bg-blue-100 text-blue-700',
    path: 'info/correspondence',
  },
  rfi: {
    label: 'Вопрос (RFI)',
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    color: 'bg-orange-100 text-orange-700',
    path: 'info/rfi',
  },
  sed: {
    label: 'СЭД',
    icon: <FolderOpen className="h-3.5 w-3.5" />,
    color: 'bg-purple-100 text-purple-700',
    path: 'sed',
  },
};

export function GlobalSearchBar({ objectId }: { objectId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Дебаунс 300мс
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Запрос при изменении дебаунс-значения
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(
      `/api/projects/${objectId}/search?q=${encodeURIComponent(debouncedQuery)}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setResults(json.data as SearchResult[]);
          setIsOpen(true);
        }
      })
      .catch(() => {
        // Игнорируем ошибки отменённых запросов
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, objectId]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(result: SearchResult) {
    const meta = TYPE_META[result.type];
    router.push(`/objects/${objectId}/${meta.path}/${result.id}`);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="Поиск по переписке, RFI, СЭД..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
          {isLoading && (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          )}

          {!isLoading && results.length === 0 && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Ничего не найдено
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="py-1 max-h-80 overflow-y-auto">
              {results.map((result) => {
                const meta = TYPE_META[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      onClick={() => handleSelect(result)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${meta.color}`}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span className="text-sm font-medium truncate">{result.title}</span>
                      </div>
                      {result.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {result.excerpt}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
