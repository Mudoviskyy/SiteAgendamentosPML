import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, WalletCards as IdCard, Mail, HelpCircle, AlertCircle, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { subDays } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

import { verificarCarteirinhaStatus, cancelarAgendamentoVisitante } from '@/services/agendamentosService';

import FAQAccordion from '@/components/visitante/FAQAccordion';
import AdicionarVinculoModal from '@/components/visitante/AdicionarVinculoModal';
import AlterarParentescoModal from '@/components/visitante/AlterarParentescoModal';

// Novos componentes importados
import DashboardHeader from './visitante/dashboard/components/DashboardHeader';
import ProximaVisitaCard from './visitante/dashboard/components/ProximaVisitaCard';
import PerfilTab from './visitante/dashboard/components/tabs/PerfilTab';
import AgendamentosTab from './visitante/dashboard/components/tabs/AgendamentosTab';
import CarteirinhasTab from './visitante/dashboard/components/tabs/CarteirinhasTab';
// import CorrespondenciaTab from './visitante/dashboard/components/tabs/CorrespondenciaTab';

import OrientacoesModal from './visitante/dashboard/modais/OrientacoesModal';
import TutorialVideoModal from './visitante/dashboard/modais/TutorialVideoModal';
import RequisitosModal from './visitante/dashboard/modais/RequisitosModal';
import UpdateProfileModal from './visitante/dashboard/modais/AtualizarPerfilModal';
import CancelModal from './visitante/dashboard/modais/CancelarAgendamentoModal';
import SuporteTab from './visitante/dashboard/components/tabs/SuporteTab';

const VisitanteDashboard = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequisitosModal, setShowRequisitosModal] = useState(false);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [carteirinhaAtiva, setCarteirinhaAtiva] = useState(false);
  const [podeRenovar, setPodeRenovar] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(null);
  
  const [proximaVisita, setProximaVisita] = useState(null);
  const [loadingVisita, setLoadingVisita] = useState(true);

  const [masterCard, setMasterCard] = useState(null);
  const [vinculos, setVinculos] = useState([]);
  const [menores, setMenores] = useState([]);
  const [solicitacaoParentesco, setSolicitacaoParentesco] = useState(null);
  const [showVinculoModal, setShowVinculoModal] = useState(false);
  const [showAlterarParentescoModal, setShowAlterarParentescoModal] = useState(false);

  const [infoModalType, setInfoModalType] = useState(null);

  // Cancelamento de Agendamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id) return;
      const status = await verificarCarteirinhaStatus(user.id);
      setCarteirinhaAtiva(status.ativa);
      setPodeRenovar(status.podeRenovar);
      setDiasRestantes(status.diasRestantes);
    };

    const fetchCarteirinhas = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('carteirinhas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const master = data.find(c => !c.protocolo?.startsWith('VIN-') && !c.protocolo?.startsWith('MEN-') && !c.protocolo?.startsWith('PAR-') && !c.menor_idade);
          const others = data.filter(c => c.protocolo?.startsWith('VIN-'));
          const minors = data.filter(c => c.protocolo?.startsWith('MEN-') || c.menor_idade);
          const parReq = data.find(c => c.protocolo?.startsWith('PAR-'));
          
          setMasterCard(master);
          setVinculos(others);
          setMenores(minors);
          setSolicitacaoParentesco(parReq);
        }
      } catch (err) {
        console.error("Erro ao buscar carteirinhas:", err);
      }
    };

    checkStatus();
    fetchCarteirinhas();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      setLoadingVisita(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: visits, error } = await supabase
          .from('agendamentos')
          .select(`id, status, nome_preso, matricula_preso, visitante2_nome, visitante3_nome, vagas_configuracao!inner(data_visita, horario, galeria, tipo_visita)`)
          .eq('id_visitante', user.id)
          .in('status', ['aprovado', 'pendente'])
          .gte('vagas_configuracao.data_visita', today);

        if (!error && visits?.length > 0) {
          visits.sort((a, b) => new Date(a.vagas_configuracao.data_visita) - new Date(b.vagas_configuracao.data_visita));
          setProximaVisita(visits[0]);
        } else {
          setProximaVisita(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVisita(false);
      }
    };

    fetchDashboardData();
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (proximaVisita && proximaVisita.vagas_configuracao) {
      const tipo = proximaVisita.vagas_configuracao.tipo_visita;
      let modalToOpen = 'presencial';

      if (tipo === 'social_video') modalToOpen = 'video';
      if (tipo === 'intima') modalToOpen = 'intima';

      const jaViu = localStorage.getItem(`viu_orientacoes_${modalToOpen}`);
      if (!jaViu) {
        setInfoModalType(modalToOpen);
        localStorage.setItem(`viu_orientacoes_${modalToOpen}`, "true");
      }
    }
  }, [proximaVisita]);



  const handleCancelarAgendamento = async () => {
    if (!selectedAgendamentoId || !user?.id) return;

    setIsCanceling(true);
    try {
      await cancelarAgendamentoVisitante(selectedAgendamentoId, user.id);
      toast({
        title: "Agendamento Cancelado",
        description: "O agendamento foi cancelado com sucesso.",
        className: "bg-green-600 text-white border-none",
      });
      setRefreshTrigger(prev => prev + 1);
      setShowCancelModal(false);
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar o agendamento.",
        variant: "destructive"
      });
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <>
      <Helmet><title>Painel do Visitante - PML</title></Helmet>

      <div className="min-h-screen bg-[#F4F6F8] flex flex-col w-full relative">
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          
          <DashboardHeader 
            profile={profile} 
            onUpdateClick={() => setShowEditModal(true)} 
          />

          <section className="bg-amber-50 text-amber-900 py-4 shadow-sm mb-6 rounded-2xl border-2 border-amber-200">
            <div className="max-w-10xl mx-auto px-2 sm:px-6 lg:px-8">
              <p className="text-center font-bold text-sm md:text-base flex items-center justify-center gap-2">
                <span className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs font-black uppercase">Aviso</span>
                ⚠️ Limite de 3 visitas sociais por mês e 2 visitas íntimas por mês por DETENTO.
              </p>
            </div>
          </section>

          <ProximaVisitaCard 
            proximaVisita={proximaVisita}
            loadingVisita={loadingVisita}
            setInfoModalType={setInfoModalType}
          />

          <Tabs defaultValue="perfil" className="space-y-6">
            <TabsList className="bg-slate-200/50 p-1 rounded-xl h-auto flex flex-wrap justify-center mx-auto gap-1 w-full max-w-4xl">
              <TabsTrigger value="perfil" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><User className="w-3.5 h-3.5 mr-2" /> Meus Dados</TabsTrigger>
              <TabsTrigger value="agendamentos" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><Calendar className="w-3.5 h-3.5 mr-2" /> Agendamentos</TabsTrigger>
              <TabsTrigger value="carteirinha" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><IdCard className="w-3.5 h-3.5 mr-2" /> Carteirinha</TabsTrigger>
              {/* <TabsTrigger value="correspondencia" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><Mail className="w-3.5 h-3.5 mr-2" /> Correspondência</TabsTrigger> */}
              <TabsTrigger value="faq" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><HelpCircle className="w-3.5 h-3.5 mr-2" /> Ajuda</TabsTrigger>
              <TabsTrigger value="suporte" className="py-2.5 px-6 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white rounded-lg"><LifeBuoy className="w-3.5 h-3.5 mr-2" /> Suporte</TabsTrigger>
            </TabsList>

            <TabsContent value="perfil">
              <PerfilTab 
                user={user}
                profile={profile}
                setShowVideoModal={setShowVideoModal}
              />
            </TabsContent>

            <TabsContent value="agendamentos">
              <AgendamentosTab 
                refreshTrigger={refreshTrigger}
                setSelectedAgendamentoId={setSelectedAgendamentoId}
                setShowCancelModal={setShowCancelModal}
              />
            </TabsContent>

            <TabsContent value="carteirinha">
              <CarteirinhasTab 
                carteirinhaAtiva={carteirinhaAtiva}
                masterCard={masterCard}
                podeRenovar={podeRenovar}
                diasRestantes={diasRestantes}
                setShowRequisitosModal={setShowRequisitosModal}
                menores={menores}
                vinculos={vinculos}
                setShowVinculoModal={setShowVinculoModal}
                onAlterarParentesco={() => setShowAlterarParentescoModal(true)}
                solicitacaoParentesco={solicitacaoParentesco}
              />
            </TabsContent>

            {/* <TabsContent value="correspondencia">
              <CorrespondenciaTab />
            </TabsContent> */}

            <TabsContent value="faq" className="space-y-6 animate-in fade-in-50">
              <div className="bg-white border-none shadow-sm rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 uppercase">Dúvidas Frequentes</h2>
                    <p className="text-sm text-slate-500">Consulte as principais dúvidas sobre o sistema e as regras do PML.</p>
                  </div>
                </div>
                <FAQAccordion />
              </div>
            </TabsContent>

            <TabsContent value="suporte">
              <SuporteTab user={user} profile={profile} />
            </TabsContent>
          </Tabs>
        </main>

        <OrientacoesModal infoModalType={infoModalType} setInfoModalType={setInfoModalType} />
        
        <TutorialVideoModal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} />
        
        <RequisitosModal isOpen={showRequisitosModal} onClose={() => setShowRequisitosModal(false)} />
        
        <UpdateProfileModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          profile={profile} 
          onUpdate={updateProfile} 
        />
        
        <CancelModal 
          isOpen={showCancelModal} 
          onClose={() => setShowCancelModal(false)} 
          onConfirm={handleCancelarAgendamento} 
          isCanceling={isCanceling} 
        />
        


        <AdicionarVinculoModal
          isOpen={showVinculoModal}
          onClose={() => setShowVinculoModal(false)}
          user={user}
          profile={profile}
          onSucesso={() => setRefreshTrigger(prev => prev + 1)}
        />

        <AlterarParentescoModal
          isOpen={showAlterarParentescoModal}
          onClose={() => setShowAlterarParentescoModal(false)}
          user={user}
          profile={profile}
          masterCard={masterCard}
          onSucesso={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </>
  );
};

export default VisitanteDashboard;