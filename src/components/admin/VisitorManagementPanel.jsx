import React, { useState } from 'react';
import { Search, Filter, Eye, CheckCircle, XCircle, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useVisitorManagement } from '@/context/VisitorManagementContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import AddVisitorModal from './AddVisitorModal';
import VisitorDetailsModal from './VisitorDetailsModal';

const VisitorManagementPanel = () => {
  const { filterVisitors, updateVisitorStatus, deleteVisitor } = useVisitorManagement();
  const { toast } = useToast();
  
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const visitors = filterVisitors(filterStatus, searchTerm);

  const handleStatusChange = (id, newStatus) => {
    updateVisitorStatus(id, newStatus);
    toast({
      title: "Status Atualizado",
      description: `Visitante atualizado para ${newStatus}.`,
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Tem certeza que deseja remover este visitante? Esta ação não pode ser desfeita.")) {
      deleteVisitor(id);
      toast({
        title: "Visitante Removido",
        description: "O registro foi excluído com sucesso.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Visitantes</h2>
          <p className="text-gray-500 text-sm">Administre os cadastros e permissões de acesso</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#2D5016] hover:bg-[#1f3810] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          ADICIONAR NOVO VISITANTE
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por CPF ou Nome"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                className="flex h-10 w-full md:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data Cadastro</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visitors.length > 0 ? (
                  visitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono">{visitor.cpf}</td>
                      <td className="px-4 py-3 font-medium">{visitor.nome}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                          ${visitor.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 
                            visitor.status === 'INATIVO' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {visitor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(visitor.dataCadastro).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Visualizar"
                            onClick={() => setSelectedVisitor(visitor)}
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          
                          {visitor.status !== 'ATIVO' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Ativar"
                              onClick={() => handleStatusChange(visitor.id, 'ATIVO')}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          
                          {visitor.status === 'ATIVO' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Inativar"
                              onClick={() => handleStatusChange(visitor.id, 'INATIVO')}
                            >
                              <XCircle className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Deletar"
                            onClick={() => handleDelete(visitor.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhum visitante encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {isAddModalOpen && (
        <AddVisitorModal onClose={() => setIsAddModalOpen(false)} />
      )}
      
      {selectedVisitor && (
        <VisitorDetailsModal 
          visitor={selectedVisitor} 
          onClose={() => setSelectedVisitor(null)} 
        />
      )}
    </div>
  );
};

export default VisitorManagementPanel;