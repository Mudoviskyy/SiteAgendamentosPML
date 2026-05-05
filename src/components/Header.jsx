import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import SecurityBanner from '@/components/SecurityBanner';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const goToPanel = () => {
    if (profile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/painel');
    }
  };

  const panelPath = profile?.role === 'admin' ? '/admin' : '/painel';

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-md flex flex-col">
      <SecurityBanner />
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-20">

          {/* Logo oficial */}
          <Link to="/" className="flex items-center space-x-4">
            <img
              src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/5f6d53c1563b5a3d23c1964d02f80076.png"
              alt="Logo Polícia Penal"
              className="h-14 w-auto"
            />
            <span className="text-lg font-semibold hidden md:block">
              Presídio Masculino de Lages
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">

            <Link to="/" className="hover:text-[#2D5016] transition-colors">
              Início
            </Link>

            <Link to="/carteirinha" className="hover:text-[#2D5016] transition-colors">
              Carteirinha
            </Link>

            <Link to="/educacao" className="hover:text-[#2D5016] transition-colors">
              Educação
            </Link>

            <Link to="/faq" className="hover:text-[#2D5016] transition-colors">
              FAQ
            </Link>

            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-800 text-white">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="hidden lg:block text-sm">
                      {profile?.nome || 'Usuário'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={goToPanel} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Painel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>

          {/* Mobile button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-white hover:bg-gray-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 bg-black border-t border-gray-800 absolute left-0 right-0 px-4 shadow-lg">

            <Link
              to="/"
              className="block px-3 py-2 text-white hover:text-[#2D5016]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </Link>

            <Link
              to="/carteirinha"
              className="block px-3 py-2 text-white hover:text-[#2D5016]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Carteirinha
            </Link>

            <Link
              to="/educacao"
              className="block px-3 py-2 text-white hover:text-[#2D5016]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Educação
            </Link>

            <Link
              to="/faq"
              className="block px-3 py-2 text-white hover:text-[#2D5016]"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to={panelPath}
                  className="block px-3 py-2 text-white hover:text-[#2D5016]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Painel
                </Link>

                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 text-red-500"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;