import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Users, Calendar, Clock, FileText, LogOut, Menu, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SecurityBanner from '@/components/SecurityBanner';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error.message);
      // Fallback redirect even on error
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Usuários', path: '/admin/usuarios', icon: <Users className="w-5 h-5" /> },
    { name: 'Agendamentos', path: '/admin/agendamentos', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Vagas', path: '/admin/vagas', icon: <Clock className="w-5 h-5" /> },
    { name: 'Relatórios', path: '/admin/relatorios', icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="sticky top-0 z-[100]">
        <SecurityBanner />
      </div>
      <div className="flex-1 flex overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#1a2e0d] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-16 border-b border-[#2d5016] bg-[#14240a]">
          <h1 className="text-xl font-bold">PML Admin</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path 
                  ? 'bg-[#2D5016] text-white shadow-md' 
                  : 'text-gray-300 hover:bg-[#2D5016]/50 hover:text-white'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-[#2d5016]">
          <div className="mb-4 px-4 py-2 bg-[#14240a] rounded text-xs text-gray-400 truncate">
            {user?.email}
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-[#2D5016]/50"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-8 pt-16 lg:pt-8">
        <Outlet />
      </main>
      </div>
    </div>
  );
};

export default AdminLayout;