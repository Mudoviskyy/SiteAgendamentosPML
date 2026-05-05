
import React from 'react';
import { X, User, Calendar, Mail, Phone, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const VisitorDetailsModal = ({ visitor, onClose }) => {
  if (!visitor) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ATIVO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> ATIVO</span>;
      case 'INATIVO':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> INATIVO</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1"/> PENDENTE</span>;
    }
  };

  // Safe string display for YYYY-MM-DD dates to avoid timezone shifts
  const displayDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-') && !dateStr.includes('T')) {
      return dateStr.split('-').reverse().join('/');
    }
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0].split('-').reverse().join('/');
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Detalhes do Visitante</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{visitor.nome}</h3>
                <p className="text-sm text-gray-500">CPF: {visitor.cpf}</p>
              </div>
            </div>
            <div>
              {getStatusBadge(visitor.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Data de Nascimento</p>
              <div className="flex items-center mt-1">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  {displayDate(visitor.dataNascimento)}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
              <div className="flex items-center mt-1">
                <Mail className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 break-all">{visitor.email}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Telefone</p>
              <div className="flex items-center mt-1">
                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{visitor.telefone || 'Não informado'}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Data de Cadastro</p>
              <div className="flex items-center mt-1">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  {displayDate(visitor.dataCadastro)}
                </span>
              </div>
            </div>
            
            {visitor.dataAprovacao && (
               <div className="col-span-2">
               <p className="text-xs font-medium text-gray-500 uppercase">Data de Aprovação</p>
               <div className="flex items-center mt-1">
                 <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                 <span className="text-sm text-gray-900">
                   {displayDate(visitor.dataAprovacao)}
                 </span>
               </div>
             </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline">Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default VisitorDetailsModal;
