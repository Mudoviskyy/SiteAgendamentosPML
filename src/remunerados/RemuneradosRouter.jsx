import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import HomeRemunerados from './pages/HomeRemunerados';
import LoginRemunerados from './pages/LoginRemunerados';
import CadastroRemunerados from './pages/CadastroRemunerados';
import PasswordRecoveryRemunerados from './pages/PasswordRecoveryRemunerados';
import PasswordResetRemunerados from './pages/PasswordResetRemunerados';

// Servidor Pages
import RemuneradosServidorProtectedRoute from './components/RemuneradosServidorProtectedRoute';
import ServidorDashboard from './servidor/ServidorDashboard';
import SolicitarServico from './servidor/SolicitarServico';
import HistoricoServicos from './servidor/HistoricoServicos';

// Admin Components & Pages
import RemuneradosAdminLayout from './components/RemuneradosAdminLayout';
import RemuneradosAdminProtectedRoute from './components/RemuneradosAdminProtectedRoute';
import RemuneradosAdminDashboard from './pages/admin/RemuneradosAdminDashboard';
import RemuneradosVagasAdmin from './pages/admin/RemuneradosVagasAdmin';
import RemuneradosScheduleGenerator from './pages/admin/RemuneradosScheduleGenerator';
import RemuneradosApprovalManagement from './pages/admin/RemuneradosApprovalManagement';
import RelatorioXLSX from './pages/admin/RelatorioXLSX';


// Shared Components
import SecurityBanner from '@/components/SecurityBanner';

const RemuneradosRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        index
        element={
          <>
            <div className="sticky top-0 z-[100]">
              <SecurityBanner />
            </div>
            <HomeRemunerados />
          </>
        }
      />

      <Route
        path="login"
        element={
          <>
            <div className="sticky top-0 z-[100]">
              <SecurityBanner />
            </div>
            <LoginRemunerados />
          </>
        }
      />

      <Route
        path="cadastro"
        element={
          <>
            <div className="sticky top-0 z-[100]">
              <SecurityBanner />
            </div>
            <CadastroRemunerados />
          </>
        }
      />

      <Route
        path="recuperar-senha"
        element={
          <>
            <div className="sticky top-0 z-[100]">
              <SecurityBanner />
            </div>
            <PasswordRecoveryRemunerados />
          </>
        }
      />

      <Route path="redefinir-senha" element={<PasswordResetRemunerados />} />

      {/* Servidor Protected Routes */}
      <Route path="servidor" element={<RemuneradosServidorProtectedRoute />}>
        <Route
          path="dashboard"
          element={
            <>
              <div className="sticky top-0 z-[100]">
                <SecurityBanner />
              </div>
              <ServidorDashboard />
            </>
          }
        />

        <Route
          path="solicitar"
          element={
            <>
              <div className="sticky top-0 z-[100]">
                <SecurityBanner />
              </div>
              <SolicitarServico />
            </>
          }
        />

        <Route
          path="historico"
          element={
            <>
              <div className="sticky top-0 z-[100]">
                <SecurityBanner />
              </div>
              <HistoricoServicos />
            </>
          }
        />
      </Route>

      {/* Admin Protected Routes - Agora isoladas sob /admin */}
      <Route path="admin" element={<RemuneradosAdminProtectedRoute />}>
        <Route element={<RemuneradosAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RemuneradosAdminDashboard />} />
          <Route path="vagas" element={<RemuneradosVagasAdmin />} />
          <Route path="schedule" element={<RemuneradosScheduleGenerator />} />
          <Route path="approvals" element={<RemuneradosApprovalManagement />} />
          <Route path="relatorio" element={<RelatorioXLSX />} />

        </Route>
      </Route>

      {/* Catch-all redirect - Mantém dentro do módulo */}
      <Route path="*" element={<Navigate to="/remunerados" replace />} />
    </Routes>
  );
};

export default RemuneradosRouter;