
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function RescheduleServiceModal({ isOpen, onClose, service, onConfirm, isLoading }) {
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNovaData('');
      setMotivo('');
      setError('');
    }
  }, [isOpen]);

  if (!service) return null;

  const handleConfirm = () => {
    setError('');
    if (!novaData) {
      setError('A nova data é obrigatória.');
      return;
    }
    if (!motivo.trim()) {
      setError('O motivo da alteração é obrigatório.');
      return;
    }
    
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const newDateObj = new Date(novaData + 'T12:00:00Z');
    newDateObj.setHours(0,0,0,0);

    if (newDateObj < hoje) {
      setError('Não é possível reagendar para o passado.');
      return;
    }

    if (novaData === service.data) {
      setError('A nova data deve ser diferente da data atual.');
      return;
    }

    onConfirm(service.id, novaData, motivo);
  };

  const formattedDate = service.data ? format(new Date(service.data + 'T12:00:00Z'), 'dd/MM/yyyy') : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Alterar Data do Serviço</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-3 bg-gray-50 rounded-md border text-sm">
            <div className="font-medium text-gray-700">Servidor: <span className="font-normal text-black">{service.servidores?.nome}</span></div>
            <div className="font-medium text-gray-700">Serviço: <span className="font-normal text-black">{service.tipo}</span></div>
            <div className="font-medium text-gray-700">Data Atual: <span className="font-normal text-black">{formattedDate}</span></div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novaData" className="text-red-500">Nova data *</Label>
            <Input
              id="novaData"
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-red-500">Motivo da alteração *</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Ajuste de escala, erro de lançamento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirmar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
