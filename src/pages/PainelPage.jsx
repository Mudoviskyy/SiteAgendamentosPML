import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import MeusAgendamentos from '@/components/visitante/MeusAgendamentos';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const PainelPage = () => {
  return (
    <>
      <Helmet><title>Painel do Visitante</title></Helmet>
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        
        {/* Header - Mais compacto e focado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Meus Agendamentos</h1>
            <p className="text-sm text-gray-500">Acompanhe e gerencie suas solicitações de visita.</p>
          </div>
          <Link to="/painel/selecao-tipo-visita">
            <Button className="bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold uppercase text-xs px-6 h-12 shadow-lg hover:shadow-[#2D5016]/20 transition-all">
              <PlusCircle className="mr-2 w-5 h-5" />
              Novo Agendamento
            </Button>
          </Link>
        </div>

        {/* Content - Sem fundo branco aqui pois o MeusAgendamentos já cria os cards */}
        <div className="min-h-[400px]">
          <MeusAgendamentos />
        </div>
      </div>
    </>
  );
};

export default PainelPage;