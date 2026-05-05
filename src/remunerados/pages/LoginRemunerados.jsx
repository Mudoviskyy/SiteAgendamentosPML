import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Loader2, Mail, Eye, EyeOff } from 'lucide-react';

const LoginRemunerados = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error("Usuário não autenticado.");

      const userId = data.user.id;

      const { data: servidor, error: servError } = await supabase
        .from('servidores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (servError) throw servError;

      if (!servidor) {
        toast({
          title: "Acesso negado",
          description: "Conta não vinculada a um servidor.",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        return;
      }

      if (!servidor.ativo) {
        toast({
          title: "Conta inativa",
          description: "Seu acesso ainda não foi liberado.",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        return;
      }

      const role = servidor.role?.trim().toLowerCase();

      if (role === 'admin') {
        navigate('/remunerados/admin/dashboard', { replace: true });
      } else {
        navigate('/remunerados/servidor/dashboard', { replace: true });
      }

    } catch (error) {
      console.error('Erro login:', error);
      
      let errorMessage = "Verifique suas credenciais.";
      
      if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de ativação.";
      }

      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950"
      style={{
        backgroundImage: `url('https://i.postimg.cc/hPDGNtF8/Chat-GPT-Image-22-de-mar-de-2026-18-00-20.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay escuro SEM desfoque (backdrop-blur removido) */}
      <div className="absolute inset-0 bg-black/40" />

      <Helmet><title>Login - Remunerados PML</title></Helmet>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#2D5016]/30 rounded-full flex items-center justify-center mb-4 border border-[#84cc41]/20">
            <Shield className="w-8 h-8 text-[#84cc41]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Acesso do Servidor</h2>
          <p className="text-zinc-400 text-sm mt-2 font-medium">Sistema de Gestão de Remunerados</p>
          
          {/* AVISO PERMANENTE */}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-700/50">
            <Mail className="w-3.5 h-3.5 text-[#84cc41]" />
            <span>Lembre-se de ativar sua conta pelo link enviado ao e-mail.</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-300 ml-1">Email Cadastrado</Label>
            <Input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-[#2D5016]" 
              placeholder="seuEmail@provedor.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 ml-1">Senha</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-[#2D5016] pr-10" 
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 focus:outline-none transition-colors"
                disabled={loading}
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
            disabled={loading}
            className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold h-12 text-lg mt-6 shadow-lg shadow-[#2D5016]/20 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Entrar no Sistema"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/remunerados/recuperar-senha" className="text-zinc-400 text-sm hover:text-[#84cc41] transition-colors">
            Esqueceu sua senha?
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-zinc-400">
          Não possui acesso?{' '}
          <Link to="/remunerados/cadastro" className="text-[#84cc41] hover:underline font-semibold transition-colors">
            Cadastre-se aqui
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest font-medium">
            Voltar ao Portal Principal
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginRemunerados;