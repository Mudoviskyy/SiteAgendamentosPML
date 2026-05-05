import React from 'react';
import { Button } from '@/components/ui/button';
import { Mail, X, Loader2, User } from 'lucide-react';

const RespostasReportModal = ({ isOpen, onClose, reportsRespondidos, loadingReplies, markRepliesAsSeen }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    markRepliesAsSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 opacity-80" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Respostas da Administração</h2>
          </div>
          <button onClick={handleClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {loadingReplies ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : reportsRespondidos.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Mail className="w-8 h-8 text-slate-300" /></div>
              <p className="text-slate-500 font-medium">Nenhuma resposta nova no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportsRespondidos.map(report => (
                <div key={report.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                  {!report.visto_visitante && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                    </span>
                  )}
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Você relatou:</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{report.mensagem}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-3 h-3 text-blue-700" /></div>
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Resposta da Equipe:</p>
                    </div>
                    <p className="text-sm font-medium text-slate-800 bg-blue-50/50 p-4 rounded-xl border border-blue-100">{report.resposta_admin}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-bold uppercase text-xs tracking-widest">Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default RespostasReportModal;
