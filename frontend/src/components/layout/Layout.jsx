import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Toast from '../common/Toast';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#1c1c18] relative">
      <Sidebar />
      <Header />
      <main className="pl-32 pr-8 pt-28 pb-16 min-h-screen w-full max-w-[1600px] mx-auto transition-all">
        {children}
      </main>
      <Toast />
    </div>
  );
}
