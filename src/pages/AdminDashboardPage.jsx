import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import VisitorManagementPanel from '@/components/admin/VisitorManagementPanel';
import { Button } from '@/components/ui/button';

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Painel Administrativo - Presídio Masculino de Lages</title>
      </Helmet>
      
      <div className="min-h-screen bg-gray-100">
        {/* Admin Header */}
        <header className="bg-[#1a2e0d] text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6" />
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">Admin</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
           <VisitorManagementPanel />
        </main>
      </div>
    </>
  );
};

export default AdminDashboardPage;