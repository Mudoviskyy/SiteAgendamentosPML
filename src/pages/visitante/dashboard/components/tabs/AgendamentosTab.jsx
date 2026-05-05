import React from 'react';
import { AlertCircle } from 'lucide-react';
import MeusAgendamentos from '@/components/visitante/MeusAgendamentos';

const AgendamentosTab = ({ refreshTrigger, setSelectedAgendamentoId, setShowCancelModal }) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="bg-green-50 p-2.5 rounded-xl shrink-0">
          <AlertCircle className="w-5 h-5 text-green-600" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm text-slate-600 leading-tight">
            <strong className="text-slate-900 uppercase text-xs tracking-tight">Atenção:</strong> cancelamentos de agendamentos após o limite de 7 dias somente via <span className="font-bold text-green-700">WhatsApp do Setor Social</span>.
          </p>
        </div>
      </div>
      <MeusAgendamentos 
        refresh={refreshTrigger} 
        onCancelClick={(id) => {
          setSelectedAgendamentoId(id);
          setShowCancelModal(true);
        }} 
      />
    </div>
  );
};

export default AgendamentosTab;
