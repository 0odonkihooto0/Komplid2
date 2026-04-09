'use client';

import { ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { KsiNode } from './useKsiTree';

interface Props {
  nodes: KsiNode[];
  expandedNodes: Map<string, KsiNode[]>;
  selectedId?: string;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string, node: KsiNode) => void;
  isLoading?: boolean;
  depth?: number;
}

/** Рекурсивный список узлов дерева КСИ с ленивой подгрузкой дочерних узлов */
export function KsiNodeList({
  nodes,
  expandedNodes,
  selectedId,
  onToggle,
  onSelect,
  isLoading = false,
  depth = 0,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <FolderTree className="h-4 w-4" />
        Нет данных
      </div>
    );
  }

  return (
    <div>
      {nodes.map((node) => {
        const hasChildren = (node._count?.children ?? 0) > 0;
        const isExpanded = expandedNodes.has(node.id);
        const childNodes = expandedNodes.get(node.id) || [];

        return (
          <div key={node.id}>
            <div
              className="flex items-center gap-1"
              style={{ paddingLeft: `${depth * 16 + 4}px` }}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onToggle(node.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              ) : (
                <span className="w-6" />
              )}

              <button
                onClick={() => onSelect(node.id, node)}
                className={`flex flex-1 flex-col rounded px-1.5 py-1 text-left text-sm hover:bg-muted ${
                  selectedId === node.id ? 'bg-primary/10 font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{node.code}</span>
                  <span className="truncate">{node.name}</span>
                  {/* Метка источника (внешний API) */}
                  {node._source === 'external' && (
                    <span className="ml-auto rounded bg-blue-50 px-1 text-[10px] text-blue-600">
                      API
                    </span>
                  )}
                </div>
                {/* Описание элемента КСИ */}
                {node.description && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {node.description}
                  </span>
                )}
              </button>
            </div>

            {isExpanded && childNodes.length > 0 && (
              <KsiNodeList
                nodes={childNodes}
                expandedNodes={expandedNodes}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
