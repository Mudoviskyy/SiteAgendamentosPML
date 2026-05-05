
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function CancelServiceModal({ isOpen, onClose, service, onConfirm, isLoading }) {
  const [motivo, setMotivo] = useState('');

  if (!service) return null;

  const handleConfirm = () => {
    onConfirm(service.id, motivo);
  };

  const formattedDate = service.data ? format(new Date(service.data + 'T12:00:00Z'), 'dd/MM/yyyy') : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Cancelar Serviço Aprovado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja cancelar este serviço?
          </p>
          <div className="p-3 bg-gray-50 rounded-md border text-sm">
            <div className="font-medium">{service.servidores?.nome}</div>
            <div className="text-gray-500">{service.tipo} - {formattedDate}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do cancelamento (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Cancelamento solicitado pelo servidor..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
