import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CircleDot,
  MinusCircle,
} from 'lucide-react';

const STATUS_CONFIGS = {
  NEW: {
    label: 'New',
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    border: 'border-[#CBD5E1]',
    icon: Clock,
  },
  OPEN: {
    label: 'Open',
    bg: 'bg-[#E0F2FE]',
    text: 'text-[#0369A1]',
    border: 'border-[#BAE6FD]',
    icon: CircleDot,
  },
  PARTIALLY_FILLED: {
    label: 'Partially Filled',
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#B45309]',
    border: 'border-[#FDE68A]',
    icon: Clock,
  },
  FILLED: {
    label: 'Filled',
    bg: 'bg-[#E6F4EF]',
    text: 'text-[#087F5B]',
    border: 'border-[#A7F3D0]',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#64748B]',
    border: 'border-[#E2E8F0]',
    icon: MinusCircle,
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    icon: XCircle,
  },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.NEW;
  const Icon = config.icon || CircleDot;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
