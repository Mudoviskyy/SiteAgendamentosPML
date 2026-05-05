import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PLANTAO_OPTIONS = [
  { value: 'A', label: 'Plantão A' },
  { value: 'B', label: 'Plantão B' },
  { value: 'C', label: 'Plantão C' },
  { value: 'D', label: 'Plantão D' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Outras Unidades', label: 'Outras Unidades' },
];

const PLANTAO_COLORS = {
  'A': 'bg-blue-500',
  'B': 'bg-emerald-500',
  'C': 'bg-amber-500',
  'D': 'bg-purple-500',
  'Administrativo': 'bg-slate-500',
  'Outras Unidades': 'bg-rose-500',
};

const RemuneradosServidorProtectedRoute = () => {
  const [loading, setLoading] = useState(true);
  const [servidor, setServidor] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [savingPlantao, setSavingPlantao] = useState(false);
  const { toast } = useToast();

  const check = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      const { data: servData, error: servError } = await supabase
        .from("servidores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (servError || !servData) {
        setServidor(null);
      } else {
        setServidor(servData);
      }

    } catch (err) {
      console.error("Erro ao validar servidor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  const handlePlantaoChange = async (novoPlantao) => {
    if (!servidor) return;
    setSavingPlantao(true);
    try {
      const { error } = await supabase
        .from('servidores')
        .update({ plantao: novoPlantao })
        .eq('id', servidor.id);

      if (error) throw error;

      // Update local state to trigger re-render and Outlet reveal
      setServidor(prev => ({ ...prev, plantao: novoPlantao }));
      
      toast({
        title: "Plantão definido!",
        description: `Seu acesso foi liberado para o ${novoPlantao}.`,
        className: "bg-[#2D5016] text-white"
      });
    } catch (err) {
      console.error("Erro ao atualizar plantão:", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua escolha.",
        variant: "destructive"
      });
    } finally {
      setSavingPlantao(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-10 h-10 animate-spin text-[#2D5016] mb-4" />
        <p className="text-zinc-400 font-medium">Validando sua sessão...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/remunerados/login" replace />;
  }

  if (servidor && !servidor.ativo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Conta Inativa</h1>
        <p className="text-zinc-400 max-w-md">Sua conta de servidor ainda não está ativa. Entre em contato com a administração para solicitar a ativação.</p>
        <button 
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/remunerados/login'; }} 
          className="mt-8 text-[#84cc41] hover:underline font-semibold"
        >
          Voltar ao Login
        </button>
      </div>
    );
  }

  // EXIGÊNCIA DE PLANTÃO
  if (servidor && !servidor.plantao) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2D5016]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-8 md:p-12 relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-[#2D5016]/20 rounded-full flex items-center justify-center mb-6 border border-[#84cc41]/20">
              <AlertTriangle className="w-10 h-10 text-[#84cc41]" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Quase lá!</h2>
            <p className="text-zinc-400 text-base mt-3 max-w-sm">
              Para liberar seu acesso, precisamos que você selecione seu **plantão de trabalho** atual.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {PLANTAO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                disabled={savingPlantao}
                onClick={() => handlePlantaoChange(opt.value)}
                className={`group p-4 rounded-2xl border-2 transition-all text-sm font-bold flex flex-col items-center justify-center gap-3 active:scale-[0.97] disabled:opacity-50
                  border-zinc-800 bg-zinc-800/50 hover:border-[#2D5016] hover:bg-[#2D5016]/10 text-zinc-300 hover:text-white shadow-sm
                `}
              >
                <div className={`w-4 h-4 rounded-full ${PLANTAO_COLORS[opt.value]} shadow-[0_0_10px_rgba(0,0,0,0.3)] group-hover:scale-125 transition-transform`} />
                {opt.label}
              </button>
            ))}
          </div>

          {savingPlantao && (
            <div className="mt-8 flex items-center justify-center gap-3 text-[#84cc41] font-medium animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Salvando configuração...</span>
            </div>
          )}

          <p className="text-center text-zinc-500 text-xs mt-10">
            Esta informação é essencial para o cálculo correto dos seus plantões remunerados.
          </p>
        </motion.div>
      </div>
    );
  }

  return <Outlet />;
};

export default RemuneradosServidorProtectedRoute;
