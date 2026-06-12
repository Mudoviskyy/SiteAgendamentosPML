import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, UserSquare2, FileText, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import AvisosMenor from './components/AvisosMenor';
import FormularioMenor from './components/FormularioMenor';

const VisitorCardMenorPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingCard, setCheckingCard] = useState(true);
  const [carteirinhasAprovadas, setCarteirinhasAprovadas] = useState([]);
  const [fluxoAtivo, setFluxoAtivo] = useState(() => {
    return sessionStorage.getItem('solicitacao_menor_fluxo') || null;
  });

  useEffect(() => {
    if (fluxoAtivo) {
      sessionStorage.setItem('solicitacao_menor_fluxo', fluxoAtivo);
    } else {
      sessionStorage.removeItem('solicitacao_menor_fluxo');
    }
  }, [fluxoAtivo]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: location }, replace: true });
      return;
    }
    if (authLoading || !user) return;

    const carregarAprovadas = async () => {
      const { data } = await supabase
        .from('carteirinhas')
        .select('nome_apenado, matricula_preso')
        .eq('usuario_id', user.id)
        .eq('status', 'aprovado')
        .eq('menor_idade', false);

      if (data) {
        const unicos = [];
        data.forEach(c => { 
          if (!unicos.find(u => u.nome_apenado === c.nome_apenado)) unicos.push(c); 
        });
        setCarteirinhasAprovadas(unicos);
      }
      setCheckingCard(false);
    };
    carregarAprovadas();
  }, [user, authLoading, navigate, location]);

  if (checkingCard) {
    return <div className="min-h-screen flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-[72px]">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 text-white py-12 px-4 shadow-lg border-b border-cyan-900/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-3xl mx-auto relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
            <UserSquare2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">Carteirinha do Menor</h1>
            <p className="text-cyan-100 font-medium mt-2 text-lg">Solicitação exclusiva para dependentes vinculados ao mesmo apenado.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <AvisosMenor />

          <CardContent className="p-6 md:p-8">
            {!fluxoAtivo ? (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 mb-6 text-center">Qual o seu caso?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button onClick={() => setFluxoAtivo('novo')} variant="outline" className="h-auto p-6 flex flex-col gap-4 border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 rounded-2xl group">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-slate-900">1ª Via (Nova)</h4>
                      <p className="text-xs text-slate-500 mt-1">Nunca teve carteirinha para este menor</p>
                    </div>
                  </Button>
                  <Button onClick={() => setFluxoAtivo('renovacao')} variant="outline" className="h-auto p-6 flex flex-col gap-4 border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 rounded-2xl group">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <RefreshCcw className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-slate-900">Renovação</h4>
                      <p className="text-xs text-slate-500 mt-1">A carteirinha do menor já venceu (2 anos)</p>
                    </div>
                  </Button>
                  <Button onClick={() => setFluxoAtivo('ja_tenho')} variant="outline" className="h-auto p-6 flex flex-col gap-4 border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 rounded-2xl group">
                    <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-slate-900">Já Tenho</h4>
                      <p className="text-xs text-slate-500 mt-1">Tenho a via oficial ativa e quero sincronizar</p>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <FormularioMenor 
                user={user} 
                profile={profile} 
                carteirinhasAprovadas={carteirinhasAprovadas}
                fluxoAtivo={fluxoAtivo}
                setFluxoAtivo={setFluxoAtivo}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitorCardMenorPage;
