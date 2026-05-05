import React from 'react';
import { Info, UserCheck, Camera, Users, ShieldCheck, Clock, Lightbulb } from 'lucide-react';

const AvisosMenor = () => {
  return (
    <div className="p-6 bg-slate-50 border-b border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-100 rounded-lg">
          <Info className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800">Orientações para Carteirinha</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Portaria nº 2189/GABS/SEJURI/2025</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* QUEM PODE PEDIR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-slate-800 text-sm">Quem pode pedir?</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A visita de menores é permitida apenas para:
            <span className="block mt-1 font-bold text-slate-900">• Filhos e Enteados</span>
            <span className="block font-bold text-slate-900">• Netos e Irmãos</span>
          </p>
        </div>

        {/* DOCUMENTOS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">Documentos (Fotos)</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tire fotos bem nítidas de:
            <span className="block mt-1">• RG ou Certidão do Menor</span>
            <span className="block">• Foto do rosto (fundo branco)</span>
            <span className="block">• Comprovante de endereço</span>
          </p>
        </div>

        {/* ACOMPANHANTE */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-orange-600" />
            <h4 className="font-bold text-slate-800 text-sm">Regras de Entrada</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            O menor <strong>nunca</strong> entra sozinho. O responsável deve ter cadastro ativo. Se não for o pai/mãe, precisa de autorização do cartório.
          </p>
        </div>

        {/* SEGURANÇA */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-5 h-5 text-cyan-600" />
            <h4 className="font-bold text-slate-800 text-sm">Revista Segura</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A revista em crianças é apenas nos pertences (fraldas e roupas) e <strong>somente visual</strong>. É proibida revista íntima em menores.
          </p>
        </div>
      </div>

      {/* PRAZOS E DICA */}
      <div className="mt-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-cyan-600 text-white p-4 rounded-xl shadow-lg shadow-cyan-100 flex items-center gap-4">
          <Clock className="w-8 h-8 opacity-50 shrink-0" />
          <div>
            <h5 className="font-black uppercase text-[10px] tracking-wider opacity-80">Prazo de Entrega</h5>
            <p className="text-sm font-bold">20 dias após aprovado</p>
            <p className="text-[10px] opacity-80">Análise em até 48h úteis</p>
          </div>
        </div>
        <div className="flex-1 bg-yellow-100 border border-yellow-200 p-4 rounded-xl flex items-center gap-4">
          <Lightbulb className="w-8 h-8 text-yellow-600 shrink-0" />
          <p className="text-[11px] text-yellow-900 leading-tight">
            <strong>DICA:</strong> Fotos com reflexo ou cortes causam cancelamento. Garanta que dá para ler tudo no documento!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvisosMenor;
