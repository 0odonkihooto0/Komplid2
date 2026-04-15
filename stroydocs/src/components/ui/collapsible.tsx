'use client';

/**
 * Collapsible — самостоятельная реализация без @radix-ui/react-collapsible.
 * API совместим с shadcn/ui Collapsible: Collapsible / CollapsibleTrigger / CollapsibleContent.
 * Используется в CollisionDetector.tsx для раскрытия секции «Исключения по IfcType».
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ── Context ─────────────────────────────────────────────────────────── */

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCtx(): CollapsibleContextValue {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error('Collapsible compound components must be used inside <Collapsible>');
  return ctx;
}

/* ── Collapsible (root) ──────────────────────────────────────────────── */

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function Collapsible({ open = false, onOpenChange, children, className }: CollapsibleProps) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      <div className={cn(className)}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

/* ── CollapsibleTrigger ──────────────────────────────────────────────── */

interface CollapsibleTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

function CollapsibleTrigger({ asChild, children, className }: CollapsibleTriggerProps) {
  const { open, onOpenChange } = useCtx();
  const handleClick = () => onOpenChange(!open);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<{ onClick?: React.MouseEventHandler }>,
      { onClick: handleClick }
    );
  }

  return (
    <button type="button" className={cn(className)} onClick={handleClick}>
      {children}
    </button>
  );
}

/* ── CollapsibleContent ──────────────────────────────────────────────── */

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

function CollapsibleContent({ children, className }: CollapsibleContentProps) {
  const { open } = useCtx();
  if (!open) return null;
  return <div className={cn(className)}>{children}</div>;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
