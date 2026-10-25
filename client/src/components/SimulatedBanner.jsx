import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function SimulatedBanner() {
  return (
    <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#667085] px-4 py-1.5 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#087F5B] shrink-0" />
          <span className="text-[11px]">
            <strong className="text-[#172B4D] font-medium">Simulated Exchange Environment:</strong>{' '}
            All orders, matching executions, and cash reservations are simulated for technical evaluation.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-[#087F5B] bg-[#E6F4EF] px-2 py-0.5 rounded border border-[#A7F3D0]">
          <span>Price-Time Priority (FIFO)</span>
        </div>
      </div>
    </div>
  );
}
