import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toast, hideToast } = useApp();

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, hideToast]);

  if (!toast.show) return null;

  const bgStyles = {
    success: 'bg-[#2A1810] text-[#FAF7F2] border-[#78C9A8]/40',
    error: 'bg-[#BA1A1A] text-[#FAF7F2] border-[#FFDAD6]/40',
    info: 'bg-[#23354D] text-[#FAF7F2] border-[#8BA3C5]/40',
  }[toast.type] || 'bg-[#2A1810] text-[#FAF7F2] border-[#7D5A44]/30';

  const iconName = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  }[toast.type] || 'notifications';

  return (
    <div className="fixed bottom-6 right-8 z-50 animate-bounce-short">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-full border shadow-2xl backdrop-blur-xl ${bgStyles} transition-all`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {iconName}
        </span>
        <span className="text-sm font-medium tracking-wide">
          {toast.message}
        </span>
        <button
          onClick={hideToast}
          className="ml-2 hover:opacity-75 transition-opacity p-0.5"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
