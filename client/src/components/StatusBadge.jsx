import React from 'react';

const STATUS_CONFIGS = {
  NEW: {
    label: 'New',
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
  OPEN: {
    label: 'Open',
    bg: 'bg-sky-950/60',
    text: 'text-sky-400',
    border: 'border-sky-800/80',
    dot: 'bg-sky-400',
  },
  PARTIALLY_FILLED: {
    label: 'Partially Filled',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/80',
    dot: 'bg-amber-400',
  },
  FILLED: {
    label: 'Filled',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/80',
    dot: 'bg-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-zinc-900',
    text: 'text-zinc-400',
    border: 'border-zinc-800',
    dot: 'bg-zinc-500',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    border: 'border-rose-800/80',
    dot: 'bg-rose-500',
  },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.NEW;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
