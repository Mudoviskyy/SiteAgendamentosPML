import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVisitorManagement } from '@/context/VisitorManagementContext';
import { useCPFMask, validateCPF } from '@/hooks/useCPFMask';
import { useToast } from '@/components/ui/use-toast';

const AddVisitorModal = ({ onClose }) => {
  const { addVisitor, getVisitorByCPF } = useVisitorManagement();
  const cpf = useCPFMask();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    email: '',
    telefone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations similar to public form
    if (!formData.nome || !cpf.value || !formData.dataNascimento || !formData.email) {
       toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!cpf.isValid() || !validateCPF(cpf.value)) {
      toast({
        title: "Erro",
        description: "CPF inválido.",
        variant: "destructive"
      });
      return;
    }

    if (getVisitorByCPF(cpf.value)) {
      toast({
        title: "Erro",
        description: "CPF já cadastrado.",
        variant: "destructive"
      });
      return;
    }

    addVisitor({
      cpf: cpf.value,
      nome: formData.nome,
      dataNascimento: formData.dataNascimento,
      email: formData.email,
      telefone: formData.telefone,
      status: 'ATIVO' // Admins create active visitors by default
    });

    toast({
      title: "Sucesso",
      description: "Visitante cadastrado com sucesso.",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Adicionar Novo Visitante</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
            <Input
              value={cpf.value}
              onChange={cpf.handleChange}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento *</label>
            <Input
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <Input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-[#2D5016] hover:bg-[#1f3810] text-white">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVisitorModal;