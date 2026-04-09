'use client';

import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useKsiTree, type KsiNode } from './useKsiTree';
import { KsiTableSelector } from './KsiTableSelector';
import { KsiNodeList } from './KsiNodeList';

interface Props {
  value?: string;
  onSelect: (nodeId: string, node: KsiNode) => void;
}

/** Компонент выбора узла КСИ с деревом, поиском и фильтром по таблице */
export function KsiTreePicker({ value, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [tableCode, setTableCode] = useState('');

  const { nodes, searchResults, isLoading, expandedNodes, toggleExpand, loadChildren, resetExpanded } =
    useKsiTree(search, tableCode || null);

  const handleTableChange = useCallback(
    (newTable: string) => {
      setTableCode(newTable);
      setSearch('');
      resetExpanded();
    },
    [resetExpanded]
  );

  const handleToggle = useCallback(
    (nodeId: string) => {
      toggleExpand(nodeId);
      loadChildren(nodeId);
    },
    [toggleExpand, loadChildren]
  );

  const handleSelect = useCallback(
    (nodeId: string, node: KsiNode) => {
      onSelect(nodeId, node);
      setSearch('');
    },
    [onSelect]
  );

  const isSearchMode = search.length >= 2;

  return (
    <div className="space-y-2">
      {/* Фильтр по классификационной таблице */}
      <KsiTableSelector value={tableCode} onChange={handleTableChange} />

      {/* Поиск по коду или названию */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по коду или названию КСИ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Результаты */}
      <div className="max-h-72 overflow-y-auto rounded-md border p-1">
        {isSearchMode ? (
          // ── Режим поиска ────────────────────────────────────────────────
          isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Ничего не найдено</p>
          ) : (
            <div>
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node.id, node)}
                  className={`flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-muted ${
                    value === node.id ? 'bg-primary/10 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
                    <span className="flex-1 truncate">{node.name}</span>
                    {node.parent && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        ← {node.parent.code}
                      </span>
                    )}
                    {node._source === 'external' && (
                      <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-600">API</span>
                    )}
                  </div>
                  {node.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {node.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          // ── Режим дерева ─────────────────────────────────────────────────
          <KsiNodeList
            nodes={nodes}
            expandedNodes={expandedNodes}
            selectedId={value}
            onToggle={handleToggle}
            onSelect={handleSelect}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
