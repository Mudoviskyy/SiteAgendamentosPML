
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { addLog } from '@/utils/logger';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    addLog('ProtectedRoute: Checking Access', { 
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      role: profile?.role,
      requiredRole
    });
  }, [location.pathname, loading, user, profile, requiredRole, location.search, location.hash]);

  if (loading) {
    addLog('ProtectedRoute: Decision -> Showing Loader', { pathname: location.pathname });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#2D5016]" />
      </div>
    );
  }

  const isResetPage = location.pathname.includes('redefinir-senha') || location.search.includes('access_token=');

  if (isResetPage) {
    addLog('ProtectedRoute: Decision -> Allowing Reset Page Access', { pathname: location.pathname });
    return children;
  }

  if (!user) {
    addLog('ProtectedRoute: Decision -> Redirect to Login (No User)', { pathname: location.pathname });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile && !isResetPage) {
    addLog('ProtectedRoute: Decision -> Showing Loader (Waiting for Profile)', { pathname: location.pathname });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#2D5016]" />
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole) {
    addLog('ProtectedRoute: Decision -> Redirect based on Role Mismatch', { 
      currentRole: profile.role, 
      requiredRole,
      pathname: location.pathname 
    });
    
    if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (profile.role === 'visitante') {
      return <Navigate to="/painel" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (profile.role === 'visitante' && !profile.aprovado) {
    addLog('ProtectedRoute: Decision -> Redirect to Waiting Approval', { pathname: location.pathname });
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  addLog('ProtectedRoute: Decision -> Access Granted', { pathname: location.pathname });
  return children;
};

export default ProtectedRoute;
