import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export function SimulatedBanner() {
  return (
    <div className="bg-amber-950/30 border-b border-amber-900/40 text-amber-200/90 px-4 py-1.5 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Simulated Trading Environment:</strong> All orders, executions, and balances are simulated for technical evaluation. No real broker connection or exchange funds are utilized.
        </span>
      </div>
    </div>
  );
}
