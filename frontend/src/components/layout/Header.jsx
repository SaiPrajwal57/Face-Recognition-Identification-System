import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/people?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 z-40 bg-[#F8F4EC]/95 backdrop-blur-md border-b border-[#7D5A44]/15 shadow-[0_2px_12px_-2px_rgba(74,52,42,0.04)] flex items-center transition-all">
      <div className="w-full max-w-[1600px] mx-auto pl-32 pr-8 flex items-center justify-between gap-4">
        {/* Search Bar Capsule */}
        <form
          onSubmit={handleSearchSubmit}
          className="h-12 flex items-center gap-3 px-5 rounded-full bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-[0_4px_16px_-2px_rgba(74,52,42,0.04)] flex-1 max-w-xl transition-all focus-within:ring-2 focus-within:ring-[#7D5A44]/30"
        >
          <span className="material-symbols-outlined text-[#8E603E] text-[20px]">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search enrolled identity, person ID, or query..."
            className="bg-transparent border-none outline-none text-sm text-[#2A1810] placeholder:text-[#7D5A44]/60 flex-1 tracking-wide font-medium"
            type="text"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 text-xs font-mono font-medium text-[#7D5A44] hover:bg-[#EFE9DF] transition-colors"
            title="Search People"
          >
            ↵ Enter
          </button>
        </form>

        {/* Right Branding */}
        <div className="flex items-center gap-3">
          {/* Branding Pill */}
          <div className="h-12 px-5 rounded-full bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-[0_4px_16px_-2px_rgba(74,52,42,0.04)] flex items-center">
            <span className="text-xs font-bold text-[#2A1810] tracking-wider uppercase font-mono">
              SENTINEL AI
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
