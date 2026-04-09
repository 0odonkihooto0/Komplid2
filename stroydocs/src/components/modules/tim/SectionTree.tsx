'use client';

import { useState, useRef } from 'react';
import { Plus, MoreHorizontal, FolderOpen, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BimSection } from './useSections';
import { useCreateSection, useRenameSection, useDeleteSection } from './useSections';

interface SectionTreeProps {
  sections: BimSection[];
  selectedId: string | null;
  onSelect: (sectionId: string | null) => void;
  projectId: string;
}

interface SectionNodeProps {
  section: BimSection;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function SectionNode({
  section, selectedId, onSelect,
  renamingId, setRenamingId, onRename, onDelete, onAddChild,
}: SectionNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = section.id === selectedId;
  const isRenaming = section.id === renamingId;

  const handleRenameSubmit = () => {
    const val = inputRef.current?.value.trim();
    if (val && val !== section.name) onRename(section.id, val);
    setRenamingId(null);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted/50 text-foreground'
        }`}
        onClick={() => !isRenaming && onSelect(section.id)}
      >
        {section.children.length > 0
          ? <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        }
        {isRenaming ? (
          <Input
            ref={inputRef}
            defaultValue={section.name}
            autoFocus
            className="h-6 text-sm px-1 py-0"
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setRenamingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{section.name}</span>
        )}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAddChild(section.id)}>
                Добавить подраздел
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenamingId(section.id)}>
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(section.id)}
                className="text-destructive focus:text-destructive">
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {section.children.length > 0 && (
        <div className="ml-4 border-l border-border pl-1">
          {section.children.map((child) => (
            <SectionNode key={child.id} section={child}
              selectedId={selectedId} onSelect={onSelect}
              renamingId={renamingId} setRenamingId={setRenamingId}
              onRename={onRename} onDelete={onDelete} onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionTree({ sections, selectedId, onSelect, projectId }: SectionTreeProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const createSection = useCreateSection(projectId);
  const renameSection = useRenameSection(projectId);
  const deleteSection = useDeleteSection(projectId);

  const handleCreateRoot = () => {
    const name = prompt('Название раздела:');
    if (name?.trim()) createSection.mutate({ name: name.trim() });
  };

  const handleAddChild = (parentId: string) => {
    const name = prompt('Название подраздела:');
    if (name?.trim()) createSection.mutate({ name: name.trim(), parentId });
  };

  const handleRename = (sectionId: string, name: string) =>
    renameSection.mutate({ sectionId, name });

  const handleDelete = (sectionId: string) => {
    if (!confirm('Удалить раздел и все вложенные?')) return;
    deleteSection.mutate(sectionId);
    if (selectedId === sectionId) onSelect(null);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
          Разделы
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5"
          onClick={handleCreateRoot} title="Добавить раздел">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div
        className={`px-2 py-1 rounded-md cursor-pointer text-sm ${
          !selectedId ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted/50 text-foreground'
        }`}
        onClick={() => onSelect(null)}
      >
        Все разделы
      </div>
      {sections.map((section) => (
        <SectionNode key={section.id} section={section}
          selectedId={selectedId} onSelect={onSelect}
          renamingId={renamingId} setRenamingId={setRenamingId}
          onRename={handleRename} onDelete={handleDelete} onAddChild={handleAddChild}
        />
      ))}
    </div>
  );
}
