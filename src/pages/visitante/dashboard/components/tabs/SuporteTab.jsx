import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { LifeBuoy, Plus, Loader2 } from 'lucide-react';
import NovoTicketModal from '@/components/visitante/NovoTicketModal';
import TicketChat from '@/components/visitante/TicketChat';

const SuporteTab = ({ user, profile }) => {
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchActiveTicket();
  }, [user]);

  const fetchActiveTicket = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Pega o ticket ativo ou o mais recente fechado
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('visitante_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignora 'no rows'

      // Se o ticket mais recente está fechado, não tratamos como "ativo" para obrigar a ver o chat,
      // mas vamos mostrar se ele quiser ver o histórico.
      // Para simplificar, se for fechado/resolvido, mostramos a tela inicial, a não ser que ele queira o histórico.
      // Aqui vamos manter o último ticket na tela se existir.
      if (data) {
        setActiveTicket(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketCreated = (ticket) => {
    setActiveTicket(ticket);
  };

  const podeCriarNovo = !activeTicket || ['resolvido', 'fechado'].includes(activeTicket.status);

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="bg-white border-none shadow-sm rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-4 rounded-2xl">
            <LifeBuoy className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Central de Ajuda</h2>
            <p className="text-sm text-slate-500 font-medium">Tire dúvidas, reporte problemas ou envie sugestões.</p>
          </div>
        </div>
        
        {podeCriarNovo && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 px-6 rounded-xl shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Chamado
          </Button>
        )}
      </div>

      <div className="flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando suporte...</span>
          </div>
        ) : activeTicket ? (
          <div className="flex flex-col">
            {podeCriarNovo && (
               <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                 <div>
                   <p className="text-emerald-800 font-bold text-sm">Seu chamado anterior foi concluído!</p>
                   <p className="text-emerald-600/80 text-xs">Você pode revisar o histórico abaixo ou abrir um novo acima.</p>
                 </div>
               </div>
            )}
            <TicketChat 
              ticket={activeTicket} 
              user={user} 
              isVisitor={true}
              onStatusChange={(updatedTicket) => setActiveTicket(updatedTicket)}
            />
          </div>
        ) : (
          <div className="text-center p-12 md:p-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <LifeBuoy className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-black text-lg md:text-xl uppercase tracking-tighter mb-2">Como podemos ajudar?</h3>
            <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
              Nossa equipe está pronta para resolver suas dúvidas e problemas técnicos com o sistema de agendamento.
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs h-14 px-8 rounded-xl shadow-xl shadow-slate-200"
            >
              <Plus className="w-4 h-4 mr-2" /> Abrir Meu Primeiro Chamado
            </Button>
          </div>
        )}
      </div>

      <NovoTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user} 
        profile={profile}
        onTicketCreated={handleTicketCreated} 
      />
    </div>
  );
};

export default SuporteTab;
