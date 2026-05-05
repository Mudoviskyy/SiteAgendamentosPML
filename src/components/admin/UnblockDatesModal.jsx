
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Unlock, AlertCircle } from 'lucide-react';

const UnblockDatesModal = ({ isOpen, onClose, onConfirm }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    setError('');
    
    if (!startDate || !endDate) {
      setError('Por favor, preencha ambas as datas.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('A data final deve ser maior ou igual à data inicial.');
      return;
    }

    onConfirm(startDate, endDate);
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-full">
              <Unlock className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl text-gray-900">Desbloquear em Massa</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 pt-2">
            Remover todos os bloqueios no intervalo de datas selecionado. Essa ação afetará bloqueios de feriado, manutenção, segurança e fechamentos manuais.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Data Início</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Data Fim</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirm}>
            Confirmar Desbloqueio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnblockDatesModal;
