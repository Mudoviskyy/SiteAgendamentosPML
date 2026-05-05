import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Loader2, AlertCircle, Chrome, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PasswordRecoveryPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      // Ajustado para rota limpa conforme sua necessidade anterior
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://presidiomasculinolages.com/redefinir-senha',
      });
      setSubmitted(true);
      toast({
        title: "Solicitação enviada",
        description: "Verifique sua caixa de entrada.",
        className: "bg-[#2D5016] text-white",
      });
    } catch (error) {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Recuperar Senha - PML</title></Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
           <Link to="/login" className="flex items-center justify-center text-[#2D5016] hover:underline mb-6 font-bold uppercase text-[10px] tracking-widest">
             <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Login
           </Link>
           <h2 className="text-center text-2xl font-black text-gray-900 uppercase tracking-tighter">Recuperar Senha</h2>
           <p className="mt-2 text-center text-xs text-gray-500 uppercase font-medium">
             Insira seu email para receber as instruções
           </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="pt-8 px-8 pb-8">
              {submitted ? (
                <div className="text-center p-6 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-sm text-green-800 leading-relaxed">
                    Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
                    <span className="block mt-3 font-black uppercase text-[10px] bg-green-100 py-1 rounded">
                      Verifique também a caixa de SPAM
                    </span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Endereço de Email</label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="exemplo@email.com"
                      className="h-12 text-gray-900 bg-white border-gray-200 focus:border-[#2D5016] rounded-lg"
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !email} 
                    className="w-full h-12 bg-[#2D5016] text-white hover:bg-[#1e3a10] text-[11px] font-black uppercase tracking-widest transition-all shadow-md"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Enviar Link de Recuperação"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* AVISO DE NAVEGADOR - COMENTADO
          <div className="mt-8 bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Aviso de Compatibilidade</h4>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Para garantir o funcionamento do link de recuperação, utilize os navegadores <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>. Outros navegadores (como o Firefox) podem apresentar instabilidade na sessão.
                </p>
                
                <div className="flex flex-wrap gap-2 pt-1">
                  <a 
                    href="https://www.google.com/chrome/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white border border-amber-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <Chrome className="w-3 h-3" /> Baixar Chrome
                  </a>
                  <a 
                    href="https://www.microsoft.com/edge" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white border border-amber-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
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

export default PasswordRecoveryPage;