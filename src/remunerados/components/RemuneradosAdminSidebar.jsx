
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardCheck, Settings, LogOut, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const RemuneradosAdminSidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/remunerados/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/remunerados/admin/dashboard' },
    { name: 'Gerenciar Vagas', icon: Settings, path: '/remunerados/admin/vagas' },
    { name: 'Gerar Agenda', icon: CalendarDays, path: '/remunerados/admin/schedule' },
    { name: 'Aprovações', icon: ClipboardCheck, path: '/remunerados/admin/approvals' },
    { name: 'Relatório', icon: FileSpreadsheet, path: '/remunerados/admin/relatorio' },
  ];

  return (
    <div className={cn(
      "h-full bg-zinc-950 text-zinc-300 flex flex-col transition-all duration-300 relative border-r border-zinc-800",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-center border-b border-zinc-800">
        <span className="text-[#84cc41] font-black text-xl tracking-wider">
          {collapsed ? 'R' : 'REMUNERADOS'}
        </span>
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-white hover:bg-[#2D5016] hover:border-[#2D5016]"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="flex-1 overflow-y-auto py-6 space-y-2 px-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors group",
              isActive ? "bg-[#2D5016]/20 text-[#84cc41]" : "hover:bg-zinc-900 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center space-x-3 px-3 py-2 w-full rounded-lg hover:bg-red-950 hover:text-red-400 transition-colors text-zinc-400",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default RemuneradosAdminSidebar;
