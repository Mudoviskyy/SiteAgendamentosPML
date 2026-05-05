import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet';
import { Loader2, CheckCircle2, XCircle, Info, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const PasswordResetRemunerados = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      // Primary: Look for tokens in query string
      let searchParams = new URLSearchParams(window.location.search);
      let accessToken = searchParams.get('access_token');

      // Secondary Fallback: If not in query string, parse from hash
      if (!accessToken && window.location.hash.includes('access_token=')) {
        const hashPart = window.location.hash.substring(window.location.hash.indexOf('access_token='));
        const hashParams = new URLSearchParams(hashPart);
        accessToken = hashParams.get('access_token');
      }

      // Small delay to allow Supabase detectSessionInUrl to process the URL
      setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        
        if (data?.session) {
          // Clean the URL parameters
          if (window.location.search.includes('access_token=') || window.location.hash.includes('access_token=')) {
             window.history.replaceState(null, '', window.location.pathname);
          }
          setReady(true);
        } else {
          setSessionError("Sessão inválida ou link de recuperação expirado.");
        }
      }, 500);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setSessionError(null);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const validatePassword = (pass) => {
    const checks = {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*()]/.test(pass)
    };
    return checks;
  };

  const passRequirements = validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    if (!Object.values(passRequirements).every(Boolean)) {
      toast({ title: "Senha Fraca", description: "Siga os requisitos abaixo do campo de senha.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso. Redirecionando...",
        className: "bg-[#2D5016] text-white",
      });

      // Redirect to the remunerados login, NOT the visitor login
      setTimeout(() => {
        navigate('/remunerados/login');
      }, 2000);

    } catch (error) {
      console.error('Erro:', error.message);
      toast({
        title: "Falha na Redefinição",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (sessionError && !ready) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950"
        style={{
          backgroundImage: `url('https://i.postimg.cc/hPDGNtF8/Chat-GPT-Image-22-de-mar-de-2026-18-00-20.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <Card className="max-w-md w-full text-center p-6 border-t-4 border-red-500 shadow-xl bg-zinc-900 border-zinc-800 relative z-10">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Link Inválido</h2>
          <p className="text-zinc-400 mb-6">{sessionError}</p>
          <Button 
            onClick={() => navigate('/remunerados/recuperar-senha')} 
            className="bg-[#2D5016] text-white w-full hover:bg-[#1f3810]"
          >
            Solicitar Novo Link
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Nova Senha - Remunerados PML</title></Helmet>
      <div 
        className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-zinc-950"
        style={{
          backgroundImage: `url('https://i.postimg.cc/hPDGNtF8/Chat-GPT-Image-22-de-mar-de-2026-18-00-20.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-[#2D5016]/30 rounded-full flex items-center justify-center mb-3 border border-[#84cc41]/20">
              <Shield className="w-7 h-7 text-[#84cc41]" />
            </div>
          </div>

          <Card className="shadow-2xl border-0 overflow-hidden bg-zinc-900 border-zinc-800">
            <div className="bg-[#2D5016] h-2 w-full" />
            <CardContent className="pt-8 px-6 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Redefinir Senha</h2>
                  <p className="text-sm text-zinc-400 mt-2">Escolha uma nova senha forte para sua segurança.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-zinc-300">Nova Senha</label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    required 
                    className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-2">
                    <p className="text-xs font-bold text-zinc-400 flex items-center gap-1 mb-1">
                      <Info className="w-3 h-3" /> REQUISITOS:
                    </p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <RequirementItem label="8+ caracteres" met={passRequirements.length} />
                      <RequirementItem label="Letra maiúscula" met={passRequirements.upper} />
                      <RequirementItem label="Um número" met={passRequirements.number} />
                      <RequirementItem label="Símbolo (!@#$)" met={passRequirements.special} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-zinc-300">Confirmar Senha</label>
                  <Input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    required 
                    className="h-11 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !ready} 
                  className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white h-12 text-base transition-all shadow-lg shadow-[#2D5016]/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" /> Salvando...
                    </div>
                  ) : "Atualizar Senha"}
                </Button>

                {!ready && !sessionError && (
                  <div className="flex justify-center items-center gap-2 pt-2">
                    <Loader2 className="animate-spin h-4 w-4 text-amber-500" />
                    <span className="text-xs text-amber-400 font-medium">Aguardando sessão...</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

const RequirementItem = ({ label, met }) => (
  <div className={`flex items-center gap-1.5 text-[11px] ${met ? 'text-[#84cc41]' : 'text-zinc-500'}`}>
    {met ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
    {label}
  </div>
);

export default PasswordResetRemunerados;
