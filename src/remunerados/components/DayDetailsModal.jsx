
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, RefreshCw, XCircle, CalendarClock, AlertTriangle, CheckCircle, Edit, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddServerModal from './AddServerModal';
import VagaForm from './VagaForm';

export default function DayDetailsModal({ isOpen, onClose, dateStr, dayData, hooks, onDataChange }) {
  const [activeTab, setActiveTab] = useState('RD');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  
  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState(null);
  const [novaData, setNovaData] = useState('');

  // Vaga edit state
  const [vagaEditMode, setVagaEditMode] = useState(false);
  const [editingVaga, setEditingVaga] = useState(null);

  if (!isOpen || !dateStr) return null;

  const {
    removerServidorEscala,
    substituirServidorEscala,
    reagendarServidor,
    adicionarServidorEscala,
    updateApprovalStatus,
    createVaga,
    updateVaga,
    fetchVagas,
    loading
  } = hooks;

  const getTipoData = (tipo) => dayData?.find(d => d.tipo === tipo) || { vagas_totais: 0, vagas_ocupadas: 0, servidores: [] };
  
  const rdData = getTipoData('RD');
  const rnData = getTipoData('RN');
  const activeData = activeTab === 'RD' ? rdData : rnData;

  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const formattedDate = format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleAdd = async (solicitacoes) => {
    const res = await adicionarServidorEscala(solicitacoes);
    if (res.success) {
      setAddModalOpen(false);
      if (onDataChange) onDataChange();
    }
  };

  const handleSubstitute = async (novoServidorId) => {
    const res = await substituirServidorEscala(selectedAgendamento, novoServidorId, dateStr, activeTab);
    if (res.success) {
      setSubModalOpen(false);
      setSelectedAgendamento(null);
      if (onDataChange) onDataChange();
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm("Tem certeza que deseja remover este servidor da escala? Esta ação cancelará o agendamento.")) {
      const res = await removerServidorEscala(id);
      if (res.success && onDataChange) onDataChange();
    }
  };

  const handleReschedule = async () => {
    if (!novaData) return;
    const res = await reagendarServidor(rescheduleId, novaData, activeTab, dateStr);
    if (res.success) {
      setRescheduleId(null);
      setNovaData('');
      if (onDataChange) onDataChange();
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm("Deseja aprovar esta solicitação de serviço remunerado?")) {
      const res = await updateApprovalStatus(id, 'aprovado');
      if (res.success && onDataChange) onDataChange();
    }
  };

  const handleStartVagaEdit = async () => {
    setVagaEditMode(true);
    // Busca a vaga atual para ter o ID
    const res = await fetchVagas({ data: dateStr, tipo: activeTab });
    if (res.success && res.data.length > 0) {
      setEditingVaga(res.data[0]);
    } else {
      // Se não existe, prepara dados para criação
      setEditingVaga({ data: dateStr, tipo: activeTab, vagas_totais: 1 });
    }
  };

  const handleVagaSubmit = async (formData) => {
    let res;
    if (editingVaga?.id) {
      res = await updateVaga(editingVaga.id, { vagas_totais: formData.vagas_totais });
    } else {
      res = await createVaga(formData);
    }
    
    if (res.success) {
      setVagaEditMode(false);
      setEditingVaga(null);
      if (onDataChange) onDataChange();
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aprovado': return 'bg-green-500';
      case 'pendente': return 'bg-amber-500';
      case 'reagendado': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const renderTable = (data) => (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
        <div>
          <span className="text-sm font-medium text-gray-500 block mb-1">Ocupação do Turno:</span>
          <div className="flex items-center gap-3">
            <span className={`font-bold text-2xl ${data.vagas_ocupadas >= data.vagas_totais && data.vagas_totais > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {data.vagas_ocupadas} / {data.vagas_totais}
            </span>
            <span className="text-sm text-gray-500">vagas preenchidas</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3" 
              onClick={handleStartVagaEdit}
            >
              <Edit className="w-3 h-3 mr-2" />
              {activeTab === 'RD' ? 'EDITAR RD' : 'EDITAR RN'}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {data.vagas_totais > 0 && data.vagas_ocupadas < data.vagas_totais && (
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="bg-[#2D5016] text-white hover:bg-[#1a330e]">
              <UserPlus className="w-4 h-4 mr-2" /> Adicionar Servidor
            </Button>
          )}
          {data.vagas_totais === 0 && (
             <Button size="sm" variant="outline" onClick={handleStartVagaEdit} className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100">
               <PlusCircle className="w-4 h-4 mr-2" />
               Configurar Vagas
             </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Servidor</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.servidores?.map((s) => (
              <TableRow key={s.agendamento_id} className="hover:bg-gray-50/50">
                <TableCell className="font-medium">{s.servidor_nome}</TableCell>
                <TableCell>{s.matricula}</TableCell>
                <TableCell className="text-xs font-semibold text-gray-600">{s.turno}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(s.status)} text-white hover:${getStatusColor(s.status)}`}>
                    {s.status?.toUpperCase() || 'DESCONHECIDO'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {rescheduleId === s.agendamento_id ? (
                    <div className="flex items-center gap-2 justify-end bg-gray-100 p-1 rounded-md">
                      <Input 
                        type="date" 
                        value={novaData} 
                        onChange={e => setNovaData(e.target.value)} 
                        className="w-[140px] h-8 bg-white" 
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Button size="sm" onClick={handleReschedule} disabled={loading || !novaData} className="h-8 bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRescheduleId(null); setNovaData(''); }} disabled={loading} className="h-8">
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      {s.status === 'pendente' && (
                        <Button size="sm" variant="outline" className="h-8 px-2 border-green-200 hover:bg-green-50" title="Aprovar Solicitação" onClick={() => handleApprove(s.agendamento_id)} disabled={loading}>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 px-2" title="Substituir Servidor" onClick={() => { setSelectedAgendamento(s.agendamento_id); setSubModalOpen(true); }} disabled={loading}>
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" title="Reagendar Data" onClick={() => setRescheduleId(s.agendamento_id)} disabled={loading}>
                        <CalendarClock className="w-4 h-4 text-amber-600" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 border-red-200 hover:bg-red-50" title="Remover da Escala" onClick={() => handleRemove(s.agendamento_id)} disabled={loading}>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!data.servidores || data.servidores.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <UserPlus className="w-8 h-8 text-gray-300 mb-2" />
                    <p>Nenhum servidor escalado para este turno.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setRescheduleId(null);
          setNovaData('');
          onClose();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 border-b pb-4">
              Gerenciar Escala - <span className="text-[#2D5016] capitalize">{formattedDate}</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-lg">
              <TabsTrigger value="RD" className="text-base py-2 data-[state=active]:bg-white data-[state=active]:text-[#2D5016] data-[state=active]:shadow-sm">
                Plantão Diurno (RD)
              </TabsTrigger>
              <TabsTrigger value="RN" className="text-base py-2 data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm">
                Plantão Noturno (RN)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="RD" className="mt-0 focus-visible:outline-none">
              {vagaEditMode ? (
                <div className="p-6 bg-gray-50 border rounded-lg mt-4 animate-in slide-in-from-top-2">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Gerenciar Vagas - Diurno (RD)</h3>
                  <VagaForm 
                    initialData={editingVaga} 
                    onSubmit={handleVagaSubmit} 
                    onCancel={() => setVagaEditMode(false)} 
                    loading={loading}
                  />
                </div>
              ) : renderTable(rdData)}
            </TabsContent>
            
            <TabsContent value="RN" className="mt-0 focus-visible:outline-none">
              {vagaEditMode ? (
                <div className="p-6 bg-gray-50 border rounded-lg mt-4 animate-in slide-in-from-top-2">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Gerenciar Vagas - Noturno (RN)</h3>
                  <VagaForm 
                    initialData={editingVaga} 
                    onSubmit={handleVagaSubmit} 
                    onCancel={() => setVagaEditMode(false)} 
                    loading={loading}
                  />
                </div>
              ) : renderTable(rnData)}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>Fechar Painel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddServerModal 
        isOpen={addModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        date={dateStr} 
        tipo={activeTab} 
        onConfirm={handleAdd}
        currentServers={activeData.servidores || []}
        title="Adicionar Novo Servidor"
      />

      <AddServerModal 
        isOpen={subModalOpen} 
        onClose={() => { setSubModalOpen(false); setSelectedAgendamento(null); }} 
        date={dateStr} 
        tipo={activeTab} 
        onConfirm={handleSubstitute}
        currentServers={activeData.servidores || []}
        title="Selecionar Servidor Substituto"
        isSubstitution={true}
      />
    </>
  );
}
