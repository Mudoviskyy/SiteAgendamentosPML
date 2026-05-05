import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Loader2, AlertCircle, Chrome, Globe, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PasswordRecoveryRemunerados = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      // Redirect to the remunerados-specific reset page
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://presidiomasculinolages.com/remunerados/redefinir-senha',
      });
      setSubmitted(true);
      toast({
        title: "Solicitação enviada",
        description: "Verifique sua caixa de entrada.",
        className: "bg-[#2D5016] text-white",
      });
    } catch (error) {
      // Always show success to avoid email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Recuperar Senha - Remunerados PML</title></Helmet>
      
      <div 
        className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-zinc-950"
        style={{
          backgroundImage: `url('https://i.postimg.cc/hPDGNtF8/Chat-GPT-Image-22-de-mar-de-2026-18-00-20.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md mb-6">
          <Link 
            to="/remunerados/login" 
            className="flex items-center justify-center text-[#84cc41] hover:text-white mb-6 font-bold uppercase text-[10px] tracking-widest transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Login
          </Link>
          
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 bg-[#2D5016]/30 rounded-full flex items-center justify-center mb-3 border border-[#84cc41]/20">
              <Shield className="w-7 h-7 text-[#84cc41]" />
            </div>
            <h2 className="text-center text-2xl font-bold text-white tracking-tight">Recuperar Senha</h2>
            <p className="mt-2 text-center text-sm text-zinc-400 font-medium">
              Insira seu email para receber as instruções
            </p>
          </div>
        </div>

        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="shadow-2xl border-0 overflow-hidden bg-zinc-900 border-zinc-800">
            <CardContent className="pt-8 px-8 pb-8">
              {submitted ? (
                <div className="text-center p-6 bg-[#2D5016]/20 border border-[#84cc41]/20 rounded-xl">
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    Se o email estiver cadastrado no sistema de remunerados, você receberá um link para redefinir sua senha.
                    <span className="block mt-3 font-black uppercase text-[10px] bg-[#2D5016]/30 text-[#84cc41] py-1 rounded">
                      Verifique também a caixa de SPAM
                    </span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase mb-1 ml-1">Endereço de Email</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="seuEmail@provedor.com.br"
                      className="h-12 text-white bg-zinc-800 border-zinc-700 placeholder:text-zinc-500 focus:border-[#84cc41] rounded-lg"
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !email} 
                    className="w-full h-12 bg-[#2D5016] text-white hover:bg-[#1f3810] text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#2D5016]/20"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Enviar Link de Recuperação"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* AVISO DE NAVEGADOR - COMENTADO
          <div className="mt-8 bg-amber-950/40 border border-amber-800/30 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider">Aviso de Compatibilidade</h4>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Para garantir o funcionamento do link de recuperação, utilize os navegadores <strong className="text-amber-200">Google Chrome</strong> ou <strong className="text-amber-200">Microsoft Edge</strong>. Outros navegadores podem apresentar instabilidade.
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <a 
                    href="https://www.google.com/chrome/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-800 border border-amber-800/30 px-3 py-1.5 rounded-lg text-[10px] font-bold text-amber-300 hover:bg-zinc-700 transition-colors"
                  >
                    <Chrome className="w-3 h-3" /> Baixar Chrome
                  </a>
                  <a 
                    href="https://www.microsoft.com/edge" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-800 border border-amber-800/30 px-3 py-1.5 rounded-lg text-[10px] font-bold text-amber-300 hover:bg-zinc-700 transition-colors"
                  >
                    <Globe className="w-3 h-3" /> Baixar Edge
                  </a>
                </div>
              </div>
            </div>
          </div>
          */}
        </div>
      </div>
    </>
  );
};

export default PasswordRecoveryRemunerados;
