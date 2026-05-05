
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Unlock, Lock, Settings, CalendarX, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ConfirmBlockModal = ({ isOpen, onClose, onConfirm, actionType, blockType, date }) => {
  if (!isOpen || !date) return null;

  const dateFormatted = format(new Date(date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const getDetails = () => {
    if (actionType === 'unblock') {
      return {
        title: 'Reabrir Data',
        description: `Tem certeza que deseja reabrir o dia ${dateFormatted} para novos agendamentos?`,
        icon: <Unlock className="w-6 h-6 text-green-600" />,
        confirmText: 'Reabrir Data',
        confirmClass: 'bg-green-600 hover:bg-green-700 text-white'
      };
    }

    switch (blockType) {
      case 'fechado':
        return {
          title: 'Bloquear como Encerrado',
          description: `Tem certeza que deseja encerrar o dia ${dateFormatted}? Novos agendamentos não serão permitidos.`,
          icon: <Lock className="w-6 h-6 text-red-600" />,
          confirmText: 'Bloquear Data',
          confirmClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'manutencao':
        return {
          title: 'Bloquear por Manutenção',
          description: `Tem certeza que deseja bloquear o dia ${dateFormatted} por motivo de manutenção?`,
          icon: <Settings className="w-6 h-6 text-yellow-600" />,
          confirmText: 'Bloquear por Manutenção',
          confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'feriado':
        return {
          title: 'Bloquear como Feriado',
          description: `Tem certeza que deseja bloquear o dia ${dateFormatted} como feriado?`,
          icon: <CalendarX className="w-6 h-6 text-blue-600" />,
          confirmText: 'Bloquear como Feriado',
          confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'seguranca':
        return {
          title: 'Bloquear por Segurança',
          description: `Tem certeza que deseja bloquear o dia ${dateFormatted} por motivos de segurança?`,
          icon: <ShieldAlert className="w-6 h-6 text-purple-600" />,
          confirmText: 'Bloquear por Segurança',
          confirmClass: 'bg-purple-600 hover:bg-purple-700 text-white'
        };
      default:
        return {
          title: 'Confirmar Ação',
          description: `Confirmar ação para o dia ${dateFormatted}?`,
          icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
          confirmText: 'Confirmar',
          confirmClass: 'bg-gray-600 hover:bg-gray-700 text-white'
        };
    }
  };

  const details = getDetails();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-full">
              {details.icon}
            </div>
            <DialogTitle className="text-xl">{details.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 pt-2">
            {details.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className={details.confirmClass} onClick={onConfirm}>
            {details.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmBlockModal;
