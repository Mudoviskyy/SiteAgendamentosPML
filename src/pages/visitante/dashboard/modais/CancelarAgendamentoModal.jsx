import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

const CancelarAgendamentoModal = ({ isOpen, onClose, onConfirm, isCanceling }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Confirmar Cancelamento
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-700">
            Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
          </p>
          <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border">
            Atenção: Cancelamentos a menos de 7 dias da visita podem estar bloqueados pelas regras do presídio.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCanceling}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isCanceling} className="bg-red-600 hover:bg-red-700 text-white">
            {isCanceling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Sim, Cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelarAgendamentoModal;
