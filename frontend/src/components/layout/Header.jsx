import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const { health, people } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationRef = React.useRef(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    }
    if (showNotificationMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotificationMenu]);

  const isHealthy = health.status === 'healthy';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/people?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="fixed top-6 left-32 right-6 h-16 z-40 flex items-center justify-between pointer-events-none">
      {/* Search Bar Capsule */}
      <form
        onSubmit={handleSearchSubmit}
        className="pointer-events-auto h-16 flex items-center gap-4 px-6 rounded-full bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_32px_-4px_rgba(74,52,42,0.06),0_0_1px_1px_rgba(125,90,68,0.06)] flex-1 max-w-xl transition-all focus-within:ring-2 focus-within:ring-[#7D5A44]/30"
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

      {/* Right Telemetry & Status Badges */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Engine Live Status Pill */}
        <div className="h-16 px-5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_32px_-4px_rgba(74,52,42,0.06),0_0_1px_1px_rgba(125,90,68,0.06)] flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isHealthy ? 'bg-[#059669] shadow-[0_0_8px_rgba(5,150,105,0.6)] animate-pulse' : 'bg-[#BA1A1A] shadow-[0_0_8px_rgba(186,26,26,0.6)]'
            }`}
          ></div>
          <span className="font-mono text-xs text-[#2A1810] tracking-wider uppercase font-semibold">
            {isHealthy ? `ENGINE ONLINE • ${health.database_mode?.toUpperCase() || 'MONGODB'}` : 'ENGINE OFFLINE'}
          </span>
        </div>

        {/* Notifications Trigger */}
        <div ref={notificationRef} className="relative">
          <div className="h-16 px-4 rounded-full bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_32px_-4px_rgba(74,52,42,0.06),0_0_1px_1px_rgba(125,90,68,0.06)] flex items-center justify-center">
            <button
              onClick={() => setShowNotificationMenu(prev => !prev)}
              aria-label="Notifications"
              className="relative p-2 text-[#7D5A44] hover:text-[#2A1810] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8E603E]"></span>
            </button>
          </div>

          {/* Notification dropdown popover */}
          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#FFFFFF] border border-[#7D5A44]/20 shadow-2xl p-4 z-50 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#7D5A44]/15">
                <span className="text-xs font-bold text-[#2A1810] uppercase tracking-wider">
                  System Status & Alerts
                </span>
                <button
                  onClick={() => setShowNotificationMenu(false)}
                  className="text-xs text-[#7D5A44] hover:text-[#2A1810]"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8F4EC] border border-[#7D5A44]/15 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#059669] text-[18px]">
                    check_circle
                  </span>
                  <div>
                    <div className="font-semibold text-[#2A1810]">Face Pipeline Operational</div>
                    <div className="text-[#7D5A44] mt-0.5">ArcFace 512-D + SCRFD face detection active</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#F8F4EC] border border-[#7D5A44]/15 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#8E603E] text-[18px]">
                    storage
                  </span>
                  <div>
                    <div className="font-semibold text-[#2A1810]">
                      Database: {health.database_mode === 'mongodb' ? 'MongoDB Atlas' : 'In-Memory Mock'}
                    </div>
                    <div className="text-[#7D5A44] mt-0.5">
                      {people.length} enrolled identity profile{people.length === 1 ? '' : 's'} registered
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Operator Pill */}
        <div className="h-16 px-5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_32px_-4px_rgba(74,52,42,0.06),0_0_1px_1px_rgba(125,90,68,0.06)] flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-[#2A1810] leading-tight">SENTINEL-AI</span>
            <span className="font-mono text-[10px] text-[#8E603E] uppercase tracking-widest font-semibold">
              SEC LEVEL 5
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#2A1810] text-[#FAF7F2] font-mono text-[10px] tracking-wider uppercase font-bold shadow-sm">
            OPERATOR
          </span>
        </div>
      </div>
    </header>
  );
}
