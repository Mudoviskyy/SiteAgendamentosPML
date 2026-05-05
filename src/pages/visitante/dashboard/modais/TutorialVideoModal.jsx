import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, X } from 'lucide-react';

const TutorialVideoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[120] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-black rounded-[24px] w-full max-w-4xl shadow-2xl border border-white/20 overflow-hidden flex flex-col">
        <div className="bg-zinc-900 p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-6 h-6 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Tutorial de Uso do Portal</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="w-full aspect-video bg-black relative">
          <iframe 
            className="absolute inset-0 w-full h-full" 
            src="https://www.youtube.com/embed/Ncmw26sf3zs?si=DeYog5bk-ijQtwkq" 
            title="Tutorial do Visitante" 
            frameBorder="0" 
            allowFullScreen>
          </iframe>
        </div>
        <div className="p-4 bg-zinc-900 text-center border-t border-zinc-800">
          <Button onClick={onClose} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px]">
            Fechar Tutorial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorialVideoModal;
