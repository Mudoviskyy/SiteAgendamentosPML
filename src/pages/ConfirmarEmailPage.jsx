import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, MailCheck, ShieldCheck, AlertTriangle } from 'lucide-react';

const ConfirmarEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle'); // idle | loading | success | error | invalid
  const [errorMsg, setErrorMsg] = useState('');
  const hasVerified = useRef(false);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'signup';
  const isRecovery = type === 'recovery';

  useEffect(() => {
    if (!tokenHash) {
      setStatus('invalid');
    }
  }, [tokenHash]);

  const handleConfirm = async () => {
    if (hasVerified.current) return;
    hasVerified.current = true;
    setStatus('loading');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      });

      if (error) {
        setStatus('error');
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          setErrorMsg('Este link expirou ou já foi utilizado. Solicite um novo e-mail de confirmação.');
        } else {
          setErrorMsg(error.message || 'Erro ao confirmar e-mail.');
        }
        hasVerified.current = false;
        return;
      }

      if (isRecovery) {
        setStatus('success');
        // Para recuperação, NÃO fazemos signOut para manter a sessão ativa 
        // e permitir que o usuário redefina a senha na próxima tela.
        setTimeout(() => navigate('/redefinir-senha', { replace: true }), 1500);
      } else {
        // Sucesso Signup — faz logout para limpar a sessão criada pelo verifyOtp
        await supabase.auth.signOut();
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Erro de conexão. Verifique sua internet e tente novamente.');
      hasVerified.current = false;
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0f0a 0%, #1a2e14 50%, #0d1a0d 100%)',
      }}
    >
      <Helmet>
        <title>{isRecovery ? 'Recuperar Senha' : 'Confirmar Email'} - PML</title>
      </Helmet>

      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(132,204,65,0.5) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 p-8">

          {/* ====== ESTADO: LINK INVÁLIDO ====== */}
          {status === 'invalid' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto bg-amber-500/15 rounded-full flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Link inválido</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Este link de confirmação está incompleto ou foi corrompido.
                Solicite um novo e-mail de confirmação.
              </p>
              <button
                onClick={handleGoToLogin}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-zinc-700"
              >
                Ir para o login
              </button>
            </div>
          )}

          {/* ====== ESTADO: AGUARDANDO CLIQUE ====== */}
          {status === 'idle' && tokenHash && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-[#2D5016]/30 rounded-full flex items-center justify-center border border-[#84cc41]/20">
                <MailCheck className="w-8 h-8 text-[#84cc41]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">
                  {isRecovery ? 'Recuperar sua senha' : 'Confirme seu e-mail'}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {isRecovery 
                    ? 'Clique no botão abaixo para prosseguir com a redefinição da sua senha de acesso.'
                    : 'Clique no botão abaixo para ativar sua conta no sistema de agendamento do Presídio Masculino de Lages.'
                  }
                </p>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3.5 bg-[#2D5016] hover:bg-[#3a6b1c] active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#2D5016]/25 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                {isRecovery ? 'Redefinir minha senha' : 'Confirmar meu e-mail'}
              </button>

              <p className="text-zinc-500 text-xs leading-relaxed">
                Se você não criou uma conta neste sistema, ignore esta página.
              </p>
            </div>
          )}

          {/* ====== ESTADO: CARREGANDO ====== */}
          {status === 'loading' && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 mx-auto bg-[#2D5016]/20 rounded-full flex items-center justify-center border border-[#84cc41]/10">
                <Loader2 className="w-8 h-8 text-[#84cc41] animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white">Confirmando...</h2>
              <p className="text-zinc-400 text-sm">
                Aguarde enquanto validamos seu e-mail.
              </p>
            </div>
          )}

          {/* ====== ESTADO: SUCESSO ====== */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 mx-auto bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isRecovery ? 'Acesso autorizado!' : 'E-mail confirmado!'}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {isRecovery 
                  ? 'Redirecionando você para a tela de nova senha...'
                  : 'Sua conta foi ativada com sucesso. Agora você pode fazer login e acessar o sistema normalmente.'
                }
              </p>
              {!isRecovery && (
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-3.5 bg-[#2D5016] hover:bg-[#3a6b1c] active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#2D5016]/25"
                >
                  Fazer login
                </button>
              )}
            </motion.div>
          )}

          {/* ====== ESTADO: ERRO ====== */}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-16 h-16 mx-auto bg-red-500/15 rounded-full flex items-center justify-center border border-red-500/20">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Falha na confirmação</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {errorMsg}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setStatus('idle'); }}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-zinc-700"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-3 text-zinc-400 hover:text-white font-medium rounded-xl transition-colors text-sm"
                >
                  Ir para o login
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer branding */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Presídio Masculino de Lages — Sistema de Agendamento de Visitas
        </p>
      </motion.div>
    </div>
  );
};

export default ConfirmarEmailPage;
