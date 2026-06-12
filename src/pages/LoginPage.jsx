import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Loader2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

// Configurações de Segurança
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 5 * 60 * 1000; // 5 minutos

const LoginPage = () => {
  const { 
    login, 
    user, 
    profile, 
    loading: authLoading,
    emailConfirmationRequired,
    adminApprovalRequired,
    authError
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // Estado para o contador visual

  // Helpers de MetaDados de Login
  const getLoginMeta = () => {
    const data = localStorage.getItem('loginMeta');
    return data ? JSON.parse(data) : { attempts: 0, blockedUntil: null };
  };

  const setLoginMeta = (meta) => {
    localStorage.setItem('loginMeta', JSON.stringify(meta));
  };

  // Efeito para gerenciar o contador regressivo
  useEffect(() => {
    const checkBlock = () => {
      const meta = getLoginMeta();
      if (meta.blockedUntil) {
        const now = Date.now();
        if (now < meta.blockedUntil) {
          setRemainingTime(Math.ceil((meta.blockedUntil - now) / 1000));
        } else {
          setRemainingTime(0);
        }
      }
    };

    checkBlock();
    const interval = setInterval(checkBlock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Redirecionamento Automático (Fallback/Persistência)
  useEffect(() => {
    // Se já temos os dados (ex: via F5 ou vindo de outra página), navega
    if (!authLoading && user && profile && !emailConfirmationRequired && !adminApprovalRequired) {
      const from = location.state?.from?.pathname || (profile.role === 'admin' ? '/admin' : '/painel');
      navigate(from, { replace: true });
    }
  }, [user, profile, authLoading, emailConfirmationRequired, adminApprovalRequired, navigate, toast, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Prevenção de clique duplo
    if (loading || authLoading || remainingTime > 0) return;

    const meta = getLoginMeta();

    // 2. Verifica bloqueio antes de tentar
    if (meta.blockedUntil && Date.now() < meta.blockedUntil) {
      return; // Já tratado pelo remainingTime no botão
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        meta.attempts += 1;

        if (meta.attempts >= MAX_ATTEMPTS) {
          meta.blockedUntil = Date.now() + BLOCK_TIME;
          meta.attempts = 0;
          toast({
            title: "Muitas tentativas",
            description: "Acesso bloqueado por 5 minutos por segurança.",
            variant: "destructive"
          });
        }

        setLoginMeta(meta);

        const errorMsg = (result.error || "").toLowerCase();

          if (errorMsg.includes("email not confirmed")) {
            toast({
              title: "Email não confirmado",
              description: "Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada ou solicite um novo link.",
              variant: "destructive"
            });
            return;
          }

          if (errorMsg.includes("invalid login credentials")) {
            toast({
              title: "Falha no login",
              description: "Email ou senha incorretos.",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "Erro no login",
            description: result.error || "Não foi possível realizar o login.",
            variant: "destructive"
          });
      } else {
        // Login bem-sucedido → limpa rastros de tentativas
        localStorage.removeItem('loginMeta');
        
        // 4. Navegação Direta (Otimização para evitar delay do useEffect)
        const profileData = result.profile;
        if (profileData) {
          const from = location.state?.from?.pathname || (profileData.role === 'admin' ? '/admin' : '/painel');
          navigate(from, { replace: true });
          toast({ 
            title: profileData.role === 'admin' ? "Bem-vindo, Administrador!" : "Bem-vindo de volta!", 
            className: profileData.role === 'admin' ? "bg-blue-600 text-white" : "bg-[#2D5016] text-white" 
          });
        }
      }
    } catch (error) { console.error(error); } finally {
      setLoading(false);
    }
  };

  // Função para formatar o tempo MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Helmet><title>Login - PML</title></Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
           <Link to="/" className="flex items-center justify-center text-[#2D5016] hover:underline mb-6 font-medium">
             <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
           </Link>
           <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Acesse sua conta</h2>
           <p className="mt-2 text-center text-sm text-gray-600 font-medium italic">
             Presídio Masculino de Lages
           </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="shadow-xl border-0 overflow-hidden">
            <div className={`h-1.5 w-full ${remainingTime > 0 ? 'bg-red-500' : 'bg-[#2D5016]'}`} />
            <CardContent className="pt-8 px-8 pb-8">
              
              {/* Alertas de Acesso (Confirmação de Email / Admin) */}
              {(authError || remainingTime > 0) && (
                <div className={`mb-6 p-4 rounded-md flex items-start border ${remainingTime > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  {remainingTime > 0 ? <Lock className="w-5 h-5 text-red-600 mr-3 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />}
                  <div>
                    <h3 className={`text-sm font-bold ${remainingTime > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
                      {remainingTime > 0 ? "Acesso Temporariamente Bloqueado" : "Acesso Restrito"}
                    </h3>
                    <p className={`mt-1 text-sm ${remainingTime > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                      {remainingTime > 0 
                        ? `Por segurança, aguarde o contador terminar para tentar novamente.` 
                        : (emailConfirmationRequired ? "Confirme seu email antes de acessar." : adminApprovalRequired ? "Aguardando aprovação administrativa." : authError)
                      }
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <Input 
                    type="email" 
                    disabled={remainingTime > 0 || loading}
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="seu@email.com"
                    className="h-11 border-gray-300 focus:ring-[#2D5016]"
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      disabled={remainingTime > 0 || loading}
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="h-11 border-gray-300 focus:ring-[#2D5016] pr-10"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                      disabled={remainingTime > 0 || loading}
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || authLoading || remainingTime > 0} 
                  className={`w-full h-12 text-white text-base font-bold transition-all shadow-md
                    ${remainingTime > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2D5016] hover:bg-[#1e3a10]'}
                  `}
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : remainingTime > 0 ? (
                    <div className="flex items-center gap-2">
                       Aguarde {formatTime(remainingTime)}
                    </div>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="px-2 bg-white text-gray-400 font-medium">Opções de conta</span>
                  </div>
                </div>

                <div className="mt-6 text-center space-y-4 flex flex-col">
                  <Link to="/cadastro-visitante" className="text-[#2D5016] font-extrabold hover:underline">
                    Não tem conta? Cadastre-se aqui
                  </Link>
                  <Link to="/recuperar-senha" title="Clique aqui para recuperar sua senha" className="text-gray-500 text-sm hover:text-gray-800 transition-colors">
                    Esqueceu sua senha?
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default LoginPage;