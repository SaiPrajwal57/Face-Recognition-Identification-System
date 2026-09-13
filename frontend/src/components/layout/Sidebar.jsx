import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { name: 'Dashboard', path: '/', icon: 'space_dashboard' },
      { name: 'Facial Recognition', path: '/live', icon: 'videocam' },
      { name: 'Enroll Person', path: '/enroll', icon: 'person_add' },
      { name: 'People Database', path: '/people', icon: 'badge' },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { name: 'Recognition History', path: '/history', icon: 'manage_history' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Settings', path: '/settings', icon: 'tune' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-20 z-50 flex flex-col items-center py-6 rounded-xl bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_36px_-6px_rgba(74,52,42,0.08),0_0_1px_1px_rgba(125,90,68,0.08)]">
      {/* Grouped Navigation Links */}
      <nav className="flex flex-col items-center gap-4 w-full px-3">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title} className="flex flex-col items-center gap-2 w-full">
            {idx > 0 && <div className="w-6 h-[1px] bg-[#7D5A44]/15 my-1"></div>}
            {section.items.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#2A1810] text-[#FAF7F2] shadow-md scale-105'
                      : 'text-[#7D5A44] hover:bg-[#F2ECE1] hover:text-[#2A1810]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {item.icon}
                  </span>

                  {/* Tactile Tooltip on hover */}
                  <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
