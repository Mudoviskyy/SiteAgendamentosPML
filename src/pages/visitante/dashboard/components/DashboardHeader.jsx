import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardHeader = ({ profile, onUpdateClick }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-normal uppercase">Painel do Visitante</h1>
        <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-wider">
          Bem-vindo (a), {profile?.nome?.split(' ')[0]}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <Button
          onClick={onUpdateClick}
          variant="outline"
          className="flex-1 border-2 h-11 px-6 font-bold uppercase text-[11px] tracking-wider bg-white w-full sm:w-auto"
        >
          Atualizar Meus Dados
        </Button>
        <Button
          onClick={() => navigate("/visitante/agendamentos")}
          className="flex-1 bg-[#2D5016] hover:bg-[#1f3810] h-11 px-6 font-bold uppercase text-[11px] tracking-wider shadow-lg text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2 text-white" /> Novo Agendamento
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
