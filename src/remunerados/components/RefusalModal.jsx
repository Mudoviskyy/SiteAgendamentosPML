import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

const RefusalModal = ({ isOpen, onClose, onConfirm, title, loading }) => {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo);
    setMotivo('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {title || 'Confirmar Recusa'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Informe o motivo da recusa. Esta informação será visível para o servidor.
          </p>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Documentação incompleta, servidor já em plantão, etc..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={loading || !motivo.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Recusa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefusalModal;
