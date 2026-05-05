import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

const MESSAGES = [
  "Verificando seus documentos...",
  "Comprimindo arquivos para envio...",
  "Enviando com segurança...",
  "Quase lá, aguarde...",
  "Finalizando sua solicitação...",
];

const ProcessingModal = ({ isOpen }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center animate-in zoom-in-90 duration-200">
        {/* Spinner com escudo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-green-700 animate-spin" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1.5 shadow">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            Processando Envio
          </h2>
          <p className="text-sm font-medium text-slate-500 transition-all duration-700 min-h-[40px]">
            {MESSAGES[msgIndex]}
          </p>
        </div>

        {/* Barra animada */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-green-600 rounded-full animate-pulse w-3/4" />
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          <strong className="text-red-500">Não feche nem atualize esta página.</strong>
          {' '}O processo pode levar até um minuto dependendo da sua conexão.
        </p>
      </div>
    </div>
  );
};

export default ProcessingModal;
