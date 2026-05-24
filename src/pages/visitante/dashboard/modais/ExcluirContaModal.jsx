import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Trash2, X, AlertCircle } from 'lucide-react';

const ExcluirContaModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = aviso, 2 = confirmação com senha
  const [readTimer, setReadTimer] = useState(30); // 30s mandatory reading on step 1

  const CONFIRM_PHRASE = 'EXCLUIR MINHA CONTA';

  // Reset & start 30s timer whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setReadTimer(30);
    setStep(1);
    const interval = setInterval(() => {
      setReadTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    setSenha('');
    setConfirmText('');
    setShowSenha(false);
    setStep(1);
    onClose();
  };

  const handleExcluir = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast({
        title: 'Confirmação incorreta',
        description: `Digite exatamente: ${CONFIRM_PHRASE}`,
        variant: 'destructive',
      });
      return;
    }

    if (!senha) {
      toast({
        title: 'Senha obrigatória',
        description: 'Informe sua senha para confirmar a exclusão.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Reautenticar o usuário com a senha para validar credencial
      const { data: authData, error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senha,
      });

      if (reAuthError || !authData?.session?.access_token) {
        toast({
          title: 'Senha incorreta',
          description: 'A senha informada não está correta. Verifique e tente novamente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // 2. Usar o token retornado diretamente pelo signInWithPassword (mais confiável)
      const accessToken = authData.session.access_token;

      // 3. Chamar a Edge Function excluir-conta com o token explícito
      const { data: fnData, error: fnError } = await supabase.functions.invoke('excluir-conta', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao excluir conta.');
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      // 4. Fazer logout local (auth já foi deletado no servidor)
      await logout({ scope: 'local' });

      toast({
        title: 'Conta excluída',
        description: 'Sua conta e dados pessoais foram removidos com sucesso.',
        className: 'bg-green-600 text-white border-none',
      });

      navigate('/', { replace: true });

    } catch (err) {
      console.error('[ExcluirConta]', err);
      toast({
        title: 'Erro ao excluir conta',
        description: err.message || 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header vermelho */}
        <div className="bg-red-600 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-base uppercase tracking-wide">
                Excluir Minha Conta
              </h2>
              <p className="text-red-200 text-xs font-medium mt-0.5">Esta ação é permanente e irreversível</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          {step === 1 ? (
            <>
              {/* Aviso inicial */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 space-y-4">
                <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  Ao excluir sua conta, acontecerá:
                </p>
                <ul className="space-y-3 text-sm text-red-700 pl-1">
                  <li className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                    <span>Seu acesso ao sistema será <strong>revogado imediatamente</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                    <span>Todos os seus <strong>documentos e fotos</strong> enviados serão apagados permanentemente.</span>
                  </li>
                  <li className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                    <span>Carteirinhas ativas e agendamentos futuros serão <strong>cancelados</strong>.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 leading-relaxed">
                <p className="text-xs text-amber-800">
                  <strong>Retenção legal:</strong> Registros de visitas já realizadas são mantidos em arquivo interno do presídio conforme obrigação legal de segurança pública (Art. 16 da LGPD).
                </p>
              </div>

              {/* 30s reading timer indicator */}
              {readTimer > 0 && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 font-black text-sm tabular-nums">
                    {readTimer}
                  </span>
                  <p className="text-xs text-slate-500">
                    Leia com atenção antes de continuar
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={readTimer > 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {readTimer > 0 ? `Continuar (${readTimer}s)` : 'Continuar'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Etapa 2: confirmação com senha */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Digite para confirmar
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder={CONFIRM_PHRASE}
                    disabled={loading}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Escreva exatamente: <strong className="text-slate-600">{CONFIRM_PHRASE}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Sua senha atual
                  </label>
                  <div className="relative">
                    <input
                      type={showSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={loading || confirmText !== CONFIRM_PHRASE || !senha}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {loading ? 'Excluindo...' : 'Excluir Definitivamente'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcluirContaModal;
