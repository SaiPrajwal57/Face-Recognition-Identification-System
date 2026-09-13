import React from 'react';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/20 shadow-2xl p-6 flex flex-col gap-5 transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-[#FFDAD6] text-[#BA1A1A]' : 'bg-[#F4EFE6] text-[#7D5A44]'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {isDestructive ? 'warning' : 'help_outline'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-[#2A1810]">{title}</h3>
            <p className="text-sm text-[#7D5A44] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#7D5A44]/15">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full border border-[#7D5A44]/25 text-[#2A1810] text-sm font-semibold hover:bg-[#F8F4EC] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#BA1A1A] hover:bg-[#93000a]'
                : 'bg-[#2A1810] hover:bg-[#3D251A]'
            }`}
          >
            {loading && (
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
