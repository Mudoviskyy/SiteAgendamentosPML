import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, Loader2 } from 'lucide-react';

const ReportBugModal = ({ isOpen, onClose, onSendReport, sendingReport }) => {
  const [reportText, setReportText] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    await onSendReport(reportText);
    setReportText(''); // Limpa o campo após enviar com sucesso
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white p-8 rounded-[24px] w-full max-w-md shadow-2xl border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 p-2.5 rounded-xl"><Bug className="w-5 h-5 text-amber-600" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 uppercase">Reportar Bug</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Encontrou algo errado no site? Nos avise e ajude a toda a comunidade a ter um site melhor para os agendamentos.</p>
          </div>
        </div>

        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          maxLength={150}
          placeholder="Descreva o problema ou a mensagem de erro que apareceu..."
          className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all mb-2 text-sm"
        />
        <p className="text-right text-[10px] font-bold text-slate-400 mb-6">{reportText.length}/150 caracteres</p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSend}
            disabled={sendingReport || reportText.trim().length < 5}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg disabled:opacity-50"
          >
            {sendingReport ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Enviar Relatório"}
          </Button>
          <Button
            variant="ghost"
            className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-6"
            onClick={onClose}
            disabled={sendingReport}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportBugModal;
