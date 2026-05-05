import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { VisitorManagementProvider } from '@/context/VisitorManagementContext';
import { Toaster } from '@/components/ui/toaster';
import ScrollToTop from '@/components/ScrollToTop';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import CadastroVisitantePage from '@/pages/CadastroVisitantePage';
import VisitanteDashboard from '@/pages/VisitanteDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { addLog } from '@/utils/logger';
import SecurityBanner from '@/components/SecurityBanner';

import { supabase } from '@/lib/supabase';

// Content Pages
import CorrespondencePage from '@/pages/CorrespondencePage';
import VisitorCardPage from '@/pages/VisitorCardPage';
import VisitorCardMenor from '@/pages/VisitorCardMenor';
import FAQPage from '@/pages/FAQPage';
import ContactPage from '@/pages/ContactPage';
import EducacaoEstudo from '@/components/visitante/EducacaoEstudo';

// LGPD Page
import PoliticaPrivacidade from '@/pages/VisitorRegistrationPage';

// Auth Pages
import PasswordRecoveryPage from '@/pages/PasswordRecoveryPage';
import PasswordResetPage from '@/pages/PasswordResetPage';
import ConfirmarEmailPage from '@/pages/ConfirmarEmailPage';
import DebugPage from '@/pages/DebugPage';

// New Pages
import AgendamentosPage from '@/pages/visitante/AgendamentosPage';

// Remunerados Module
import RemuneradosRouter from '@/remunerados/RemuneradosRouter';

// Router Logger Component
const RouteLogger = () => {
  const location = useLocation();

  useEffect(() => {
    addLog('App: Route Changed', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      key: location.key
    });
  }, [location]);

  return null;
};

const AuthHashHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {

      const hasToken =
        location.hash.includes('access_token') ||
        location.search.includes('access_token');

      if (!hasToken) return;

      const params = new URLSearchParams(
        location.hash ? location.hash.replace('#', '') : location.search
      );

      const type = params.get('type');

      console.log("Auth detectado:", { type, path: location.pathname });

      // 🔥 AGUARDA o Supabase processar sozinho
      setTimeout(() => {

        if (type === "recovery") {
          // Check if this is a remunerados recovery or a visitor recovery
          if (location.pathname.startsWith('/remunerados')) {
            navigate("/remunerados/redefinir-senha", { replace: true });
          } else {
            navigate("/redefinir-senha", { replace: true });
          }
        } else {
          navigate("/login", { replace: true });
        }

        // limpa URL
        window.history.replaceState({}, document.title, location.pathname);

      }, 500); // tempo pra sessão estabilizar

    };

    handleAuth();
  }, [location]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <VisitorManagementProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <RouteLogger />
          <AuthHashHandler />
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-gray-50 relative">
            <Routes>
              {/* DEBUG ROUTE */}
              <Route path="/debug" element={<DebugPage />} />

              {/* 1. ROTA DE REDEFINIÇÃO (ISOLADA) */}
              <Route path="/redefinir-senha/*" element={<PasswordResetPage />} />

              {/* MÓDULO REMUNERADOS - Roteamento Independente */}
              <Route path="/remunerados/*" element={<RemuneradosRouter />} />

              {/* CONFIRMAÇÃO DE EMAIL (página standalone, imune a prefetching) */}
              <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />

              {/* 2. Rotas Públicas com Layout Padrão */}
              <Route path="/" element={<><Header /><HomePage /><Footer /></>} />
              <Route path="/login" element={<><div className="sticky top-0 z-[100]"><SecurityBanner /></div><LoginPage /></>} />
              <Route path="/register" element={<><div className="sticky top-0 z-[100]"><SecurityBanner /></div><RegisterPage /></>} />
              <Route path="/cadastro-visitante" element={<><div className="sticky top-0 z-[100]"><SecurityBanner /></div><CadastroVisitantePage /></>} />
              <Route path="/recuperar-senha" element={<><div className="sticky top-0 z-[100]"><SecurityBanner /></div><PasswordRecoveryPage /></>} />

              {/* NOVA ROTA LGPD - ACESSÍVEL PELA HOME E PELO CADASTRO */}
              <Route path="/politica-privacidade" element={<><Header /><PoliticaPrivacidade /><Footer /></>} />

              {/* Informational Pages */}
              <Route path="/correspondencia" element={<><Header /><CorrespondencePage /><Footer /></>} />
              <Route path="/carteirinha" element={<><Header /><VisitorCardPage /><Footer /></>} />
              <Route path="/carteirinha-menor" element={<><Header /><VisitorCardMenor /><Footer /></>} />
              <Route path="/faq" element={<><Header /><FAQPage /><Footer /></>} />
              <Route path="/contato" element={<><Header /><ContactPage /><Footer /></>} />
              <Route path="/educacao" element={<><Header /><EducacaoEstudo /><Footer /></>} />

              {/* 3. Protected Visitor Routes */}
              <Route
                path="/painel"
                element={
                  <ProtectedRoute requiredRole="visitante">
                    <><Header /><VisitanteDashboard /><Footer /></>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/visitante/agendamentos"
                element={
                  <ProtectedRoute requiredRole="visitante">
                    <><Header /><AgendamentosPage /><Footer /></>
                  </ProtectedRoute>
                }
              />

              {/* Redirecionamento de rota antiga */}
              <Route
                path="/painel/agendar"
                element={<Navigate to="/visitante/agendamentos" replace />}
              />

              {/* 4. Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* 5. 404 Route */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col p-4 text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">Página não encontrada</p>
                  <a href="/" className="px-6 py-3 bg-[#2D5016] text-white rounded-md hover:bg-[#1f3810] transition-colors">
                    Voltar ao início
                  </a>
                </div>
              } />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </VisitorManagementProvider>
    </AuthProvider>
  );
}

export default App;