
import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Pencil, Trash2, Calendar, Settings, Loader2, Save } from 'lucide-react';
import { useRemuneradosAdmin } from '../../hooks/useRemuneradosAdmin';
import { remuneradosAdminService } from '../../services/remuneradosAdminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import VagaForm from '../../components/VagaForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RemuneradosVagasAdmin = () => {
  const { fetchVagas, createVaga, updateVaga, deleteVaga, getAdminServidorId, loading } = useRemuneradosAdmin();
  const { toast } = useToast();
  const [vagas, setVagas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVaga, setEditingVaga] = useState(null);
  
  // Filters & Pagination
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterData, setFilterData] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // === LIMITES MENSAIS STATE ===
  const [isLimitesOpen, setIsLimitesOpen] = useState(false);
  const [limitesMes, setLimitesMes] = useState('');
  const [limiteRd, setLimiteRd] = useState(5);
  const [limiteRn, setLimiteRn] = useState(5);
  const [savingLimites, setSavingLimites] = useState(false);
  const [loadingLimites, setLoadingLimites] = useState(false);

  const loadData = async () => {
    const filters = {};
    if (filterTipo !== 'todos') filters.tipo = filterTipo;
    if (filterData) filters.data = filterData;
    
    const res = await fetchVagas(filters, page, limit);
    if (res.success) {
      setVagas(res.data);
      setTotal(res.count || 0);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipo, filterData, page]);

  const totalPages = Math.ceil(total / limit);

  const handleNextPage = () => {
    if (page + 1 < totalPages) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(p => p - 1);
  };

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [filterTipo, filterData]);

  const handleOpenModal = (vaga = null) => {
    setEditingVaga(vaga);
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    let res;
    if (editingVaga) {
      res = await updateVaga(editingVaga.id, data);
    } else {
      res = await createVaga({ ativa: true, ...data, vagas_ocupadas: 0 });
    }
    
    if (res.success) {
      setIsModalOpen(false);
      loadData();
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Deseja realmente excluir esta vaga? Esta ação só será permitida se não houver agendamentos vinculados.")) {
      const res = await deleteVaga(id);
      if (res.success) {
        loadData();
      }
    }
  };

  // === LIMITES MENSAIS HANDLERS ===

  const gerarMesesDisponiveis = () => {
    const now = new Date();
    const meses = [];
    for (let i = -1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      meses.push({ value: anoMes, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return meses;
  };

  const handleOpenLimites = async () => {
    const now = new Date();
    const anoMesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setLimitesMes(anoMesAtual);
    setIsLimitesOpen(true);
    await carregarLimites(anoMesAtual);
  };

  const carregarLimites = async (anoMes) => {
    setLoadingLimites(true);
    const res = await remuneradosAdminService.fetchLimitesMes(anoMes);
    if (res.success) {
      setLimiteRd(res.data.limite_rd);
      setLimiteRn(res.data.limite_rn);
    }
    setLoadingLimites(false);
  };

  const handleMesChange = async (novoMes) => {
    setLimitesMes(novoMes);
    await carregarLimites(novoMes);
  };

  const handleSalvarLimites = async () => {
    setSavingLimites(true);
    const adminId = await getAdminServidorId();
    const res = await remuneradosAdminService.upsertLimitesMes(limitesMes, limiteRd, limiteRn, adminId);
    setSavingLimites(false);

    if (res.success) {
      toast({
        title: "Limites Salvos!",
        description: `RD: ${limiteRd} / RN: ${limiteRn} por servidor para ${limitesMes}.`,
        className: "bg-[#2D5016] text-white"
      });
      setIsLimitesOpen(false);
    } else {
      toast({ title: "Erro ao salvar", description: res.error, variant: "destructive" });
    }
  };

  const mesesDisponiveis = gerarMesesDisponiveis();

  return (
    <div className="space-y-6">
      <Helmet><title>Vagas - Remunerados</title></Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="RD">Plantão RD</SelectItem>
              <SelectItem value="RN">Plantão RN</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input type="date" value={filterData} onChange={(e) => setFilterData(e.target.value)} className="pl-9 bg-white" />
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleOpenLimites} className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
            <Settings className="w-4 h-4 mr-2" /> Limites do Mês
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-[#2D5016] text-white hover:bg-[#1f3810]">
            <Plus className="w-4 h-4 mr-2" /> Nova Vaga
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Data</TableHead>
              <TableHead className="font-bold">Tipo</TableHead>
              <TableHead className="font-bold text-center">Ocupação</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && vagas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : vagas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Nenhuma vaga encontrada</TableCell></TableRow>
            ) : (
              vagas.map((vaga) => (
                <TableRow key={vaga.id}>
                  <TableCell className="font-medium">
                    {format(new Date(vaga.data + 'T12:00:00Z'), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={vaga.tipo === 'RD' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                      {vaga.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-gray-700">{vaga.vagas_ocupadas || 0}</span>
                    <span className="text-gray-400 text-sm"> / {vaga.vagas_totais}</span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(vaga)} className="text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(vaga.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <Button variant="outline" disabled={page === 0} onClick={handlePrevPage} className="flex items-center">
            Anterior
          </Button>
          <span className="text-sm font-medium text-gray-600">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" disabled={page + 1 >= totalPages} onClick={handleNextPage} className="flex items-center">
            Próxima
          </Button>
        </div>
      )}

      {/* Modal de Criar/Editar Vaga */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingVaga ? 'Editar Vaga' : 'Criar Nova Vaga'}</DialogTitle>
          </DialogHeader>
          <VagaForm 
            initialData={editingVaga} 
            onSubmit={handleSave} 
            onCancel={() => setIsModalOpen(false)} 
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Limites Mensais */}
      <Dialog open={isLimitesOpen} onOpenChange={setIsLimitesOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              Limites Mensais por Servidor
            </DialogTitle>
            <DialogDescription>
              Defina quantos plantões RD e RN cada servidor pode solicitar no mês selecionado.
            </DialogDescription>
          </DialogHeader>

          {loadingLimites ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-gray-700">Mês de Referência</Label>
                <Select value={limitesMes} onValueChange={handleMesChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesDisponiveis.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <Label className="text-xs font-bold text-amber-800 uppercase tracking-wider">Limite RD</Label>
                  <p className="text-[10px] text-amber-600 mb-1">Retribuição Diária</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={limiteRd}
                      onChange={(e) => setLimiteRd(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="bg-white text-center text-lg font-bold h-12 border-amber-200"
                    />
                    <span className="text-sm text-amber-700 font-medium whitespace-nowrap">por servidor</span>
                  </div>
                </div>

                <div className="space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <Label className="text-xs font-bold text-blue-800 uppercase tracking-wider">Limite RN</Label>
                  <p className="text-[10px] text-blue-600 mb-1">Retribuição Noturna</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={limiteRn}
                      onChange={(e) => setLimiteRn(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      className="bg-white text-center text-lg font-bold h-12 border-blue-200"
                    />
                    <span className="text-sm text-blue-700 font-medium whitespace-nowrap">por servidor</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <strong>Obs:</strong> Os limites valem para <u>todos</u> os servidores no mês selecionado. 
                  Se não configurar um mês, o padrão é <strong>5 RD</strong> e <strong>5 RN</strong>.
                </p>
              </div>

              <Button
                onClick={handleSalvarLimites}
                disabled={savingLimites}
                className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold h-11"
              >
                {savingLimites ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar Limites</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RemuneradosVagasAdmin;
