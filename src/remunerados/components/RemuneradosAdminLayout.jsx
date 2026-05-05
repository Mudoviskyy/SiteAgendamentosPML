
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import RemuneradosAdminSidebar from './RemuneradosAdminSidebar';
import { Bell, UserCircle } from 'lucide-react';
import SecurityBanner from '@/components/SecurityBanner';

const RemuneradosAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <div className="sticky top-0 z-[100]">
        <SecurityBanner />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <RemuneradosAdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 hidden sm:block">Painel de Administração</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-[#2D5016] rounded-full hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">Gestão de Escalas</p>
              </div>
              <UserCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
};

export default RemuneradosAdminLayout;
