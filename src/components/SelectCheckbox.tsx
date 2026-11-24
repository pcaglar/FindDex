'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface SelectCheckboxProps {
  checked: boolean;
  label: string;
  className?: string;
  /** When set the box is a real button; otherwise it is a visual marker inside a clickable card. */
  onToggle?: () => void;
}

export function SelectCheckbox({ checked, label, className = '', onToggle }: SelectCheckboxProps) {
  const box = (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 shadow transition ${
        checked ? 'border-pink-500 bg-pink-500 text-white' : 'border-white/70 bg-black/50 text-transparent'
      } ${className}`}
    >
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  );
  if (!onToggle) return <span aria-hidden="true" className={className ? undefined : 'contents'}>{box}</span>;
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={(event) => { event.stopPropagation(); onToggle(); }}>
      {box}
    </button>
  );
}
