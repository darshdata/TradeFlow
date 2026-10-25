import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <div className="w-8 h-8 rounded-full bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#D64545]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E6F4EF] border border-[#A7F3D0] flex items-center justify-center text-[#087F5B]">
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
            <h3 className="font-semibold text-[#172B4D] text-sm">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-[#667085] hover:text-[#172B4D] p-1 rounded-md hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs text-[#172B4D] space-y-3">
          {message && <p className="text-[#667085] leading-relaxed">{message}</p>}
          {children}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#172B4D] hover:bg-[#F1F5F9] text-xs font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-[#D64545] hover:bg-[#B91C1C] text-white'
                : 'bg-[#087F5B] hover:bg-[#066649] text-white'
            }`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
