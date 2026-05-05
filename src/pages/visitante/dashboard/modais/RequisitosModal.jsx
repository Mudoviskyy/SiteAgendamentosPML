import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, X } from 'lucide-react';

const RequisitosModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#2D5016] p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 opacity-80" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Requisitos para Visita</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-700 space-y-6">
          <p className="font-bold text-slate-900">Para adentrar no Presídio Masculino de Lages e realizar visita, é obrigatório o cumprimento das exigências documentais abaixo:</p>

          <div className="space-y-4">
            <div className="flex gap-3 items-start"><Badge className="bg-slate-100 text-slate-600 rounded-md">1</Badge><p><strong>RG atualizado com CPF</strong> (Decreto 10.977/2022);</p></div>
            <div className="flex gap-3 items-start"><Badge className="bg-slate-100 text-slate-600 rounded-md">2</Badge>
              <div>
                <p><strong>Comprovante de residência</strong> (emitido há no máximo 90 dias) em nome do visitante;</p>
                <p className="text-xs text-slate-500 mt-1 italic">(Aceitos: Água, luz, telefone, internet, contrato de aluguel registrado em cartório ou declaração de residência assinada pelo titular da conta).</p>
              </div>
            </div>
            <div className="flex gap-3 items-start"><Badge className="bg-slate-100 text-slate-600 rounded-md">3</Badge><p><strong>Foto 3x4 recente</strong> (até 3 meses);</p></div>
            <div className="flex gap-3 items-start"><Badge className="bg-slate-100 text-slate-600 rounded-md">4</Badge><p><strong>Certidão de Casamento/União Estável</strong> (apenas para cônjuges);</p></div>
            <div className="flex gap-3 items-start"><Badge className="bg-slate-100 text-slate-600 rounded-md">5</Badge><p><strong>Certidão de Nascimento de menores</strong> (quando aplicável);</p></div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-2 text-amber-900">
            <p className="font-bold uppercase tracking-wider text-amber-700">Avisos Importantes:</p>
            <p>• Documentos ilegíveis ou incompletos resultarão na <strong>recusa do cadastro</strong>.</p>
            <p>• A carteirinha só terá validade após análise e aprovação pelo Setor Social.</p>
            <p>• Em caso de dúvida, entre em contato com o serviço social via WhatsApp antes de comparecer.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <Button onClick={onClose} className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white py-6 rounded-xl font-bold uppercase text-xs tracking-widest">Entendi os Requisitos</Button>
        </div>
      </div>
    </div>
  );
};

export default RequisitosModal;
