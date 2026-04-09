'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, className, children, ...props }, ref) => (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} role="radiogroup" className={cn('grid gap-2', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, className, disabled, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const checked = ctx.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && ctx.onValueChange?.(value)}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-primary text-primary',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'flex items-center justify-center',
          className
        )}
        {...props}
      >
        {checked && (
          <span className="h-2 w-2 rounded-full bg-primary block" />
        )}
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
