import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { name: 'Dashboard', path: '/', icon: 'space_dashboard' },
      { name: 'Live Recognition', path: '/live', icon: 'videocam' },
      { name: 'Identification', path: '/identify', icon: 'center_focus_strong' },
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
    <aside className="fixed left-6 top-6 bottom-6 w-20 z-50 flex flex-col items-center justify-between py-6 rounded-xl bg-[#FFFFFF]/90 backdrop-blur-2xl border border-[#7D5A44]/15 shadow-[0_12px_36px_-6px_rgba(74,52,42,0.08),0_0_1px_1px_rgba(125,90,68,0.08)]">
      {/* Top Brand Logo Pill */}
      <div className="flex flex-col items-center gap-3">
        <NavLink
          to="/"
          className="w-12 h-12 rounded-full bg-[#2A1810] text-[#FAF7F2] flex items-center justify-center font-bold shadow-md shadow-[#2A1810]/20 hover:scale-105 transition-transform"
          title="Sentinel Biometric Vision"
        >
          <span className="material-symbols-outlined text-[24px]">center_focus_strong</span>
        </NavLink>
        <div className="w-8 h-[1px] bg-[#7D5A44]/20"></div>
      </div>

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

      {/* Bottom Status / Profile Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <div className="w-10 h-10 rounded-full p-[2px] bg-[#EFE9DF] border border-[#7D5A44]/25 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#7D5A44] text-[20px]">
              verified_user
            </span>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#059669] ring-2 ring-white"></span>
          <span className="absolute left-16 px-3 py-1.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
            Node Active • SEC LEVEL 5
          </span>
        </div>
      </div>
    </aside>
  );
}
