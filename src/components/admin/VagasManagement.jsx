
import React, { useState, useEffect, useCallback } from 'react';
import { useVagas } from '@/hooks/useVagas';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, Loader2, Calendar, Clock, Layers, Info, Copy, ChevronLeft, ChevronRight, Unlock, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmBlockModal from './ConfirmBlockModal';
import UnblockDatesModal from './UnblockDatesModal';
import { unblockDateRange } from '@/services/vagasService';

const VagasManagement = () => {
  const { vagas, total, loading: vagasLoading, fetchVagas, createVaga, updateVaga, deleteVaga } = useVagas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingVaga, setEditingVaga] = useState(null);
  const [options, setOptions] = useState({ tiposVisita: [] });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(total / pageSize);
  
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [bloqueiosMap, setBloqueiosMap] = useState({});
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState('block'); // 'block' or 'unblock'
  const [modalBlockType, setModalBlockType] = useState('fechado');
  const [modalDate, setModalDate] = useState('');
  
  // Unblock Bulk Modal State
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [unblockingBulk, setUnblockingBulk] = useState(false);

  // Mass Block Modal State
  const [showMassBlockModal, setShowMassBlockModal] = useState(false);
  const [massBlockForm, setMassBlockForm] = useState({
    startDate: '',
    endDate: '',
    status: 'fechado',
    galeria: 'Todas'
  });
  const [massBlocking, setMassBlocking] = useState(false);

  const [formData, setFormData] = useState({
    data_visita: '',
    data_fim: '',
    horario: '',
    tipo_visita: '',
    galeria: '',
    vagas_totais: 10,
    dias_semana: [1, 2, 3, 4, 5, 6, 0] 
  });

  const galeriaColors = {
    'A': 'bg-blue-100 text-blue-700 border-blue-200',
    'B': 'bg-purple-100 text-purple-700 border-purple-200',
    'C': 'bg-amber-100 text-amber-700 border-amber-200',
    'D': 'bg-rose-100 text-rose-700 border-rose-200',
    'E': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  const fetchBloqueios = async () => {
    const { data } = await supabase
      .from("bloqueios_agendamento")
      .select("*");

    const map = {};
    (data || []).forEach(b => {
      const dataFormatada = b.data_visita?.slice(0, 10);
        map[dataFormatada] = b;
    });

    setBloqueiosMap(map);
  };

  useEffect(() => {
    fetchVagas({ page, pageSize, tipo: tipoFilter, data: dateFilter });
  }, [fetchVagas, page, pageSize, tipoFilter, dateFilter]);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await supabase.from('tipos_visita').select('codigo, nome');
      setOptions({ tiposVisita: data || [] });
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchBloqueios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isBulkMode && !editingVaga) {
        const start = new Date(formData.data_visita + 'T00:00:00');
        const end = new Date(formData.data_fim + 'T00:00:00');
        let current = new Date(start);
        let count = 0;
        let errors = 0;

        while (current <= end) {
          if (formData.dias_semana.includes(current.getDay())) {
            const dataString = current.toISOString().split('T')[0];
            const { error } = await supabase.from('vagas_configuracao').insert([{
              data_visita: dataString,
              horario: formData.horario,
              tipo_visita: formData.tipo_visita,
              galeria: formData.galeria,
              vagas_totais: formData.vagas_totais
            }]);
            
            if (error) {
              if (error.code === '23505') errors++;
              else throw error;
            } else {
              count++;
            }
          }
          current.setDate(current.getDate() + 1);
        }

        if (errors > 0) {
          toast({ 
            title: "Atenção", 
            description: `${count} criadas, mas ${errors} já existiam e foram ignoradas.`, 
            variant: "destructive" 
          });
        } else {
          toast({ title: `${count} vagas criadas!`, className: "bg-[#2D5016] text-white" });
        }
        await fetchVagas({ page, pageSize, tipo: tipoFilter, data: dateFilter });
      } else {
        const payload = {
          data_visita: formData.data_visita,
          horario: formData.horario,
          tipo_visita: formData.tipo_visita,
          galeria: formData.galeria,
          vagas_totais: formData.vagas_totais
        };

        let resultError;
        if (editingVaga) {
          const { error } = await supabase.from('vagas_configuracao').update(payload).eq('id', editingVaga.id);
          resultError = error;
        } else {
          const { error } = await supabase.from('vagas_configuracao').insert([payload]);
          resultError = error;
        }

        if (resultError) {
          if (resultError.code === '23505') {
            toast({ 
              title: "Conflito de Horário", 
              description: "Já existe uma vaga configurada para este horário, galeria e tipo nesta data.", 
              variant: "destructive" 
            });
            setSaving(false);
            return;
          }
          throw resultError;
        }

        toast({ title: editingVaga ? "Vaga atualizada" : "Operação concluída", className: "bg-[#2D5016] text-white" });
        await fetchVagas({ page, pageSize, tipo: tipoFilter, data: dateFilter });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro na operação", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingVaga(null);
    setIsBulkMode(false);
    setFormData({
      data_visita: '',
      data_fim: '',
      horario: '',
      tipo_visita: options.tiposVisita?.[0]?.codigo || '',
      galeria: '',
      vagas_totais: 10,
      dias_semana: [1, 2, 3, 4, 5, 6, 0]
    });
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(day) 
        ? prev.dias_semana.filter(d => d !== day) 
        : [...prev.dias_semana, day]
    }));
  };

  const handleDeleteVaga = async (vaga) => {
    try {
      const { count, error } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('vaga_configuracao_id', vaga.id);

      if (error) throw error;

      if (count > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Essa vaga possui agendamentos vinculados.",
          variant: "destructive"
        });
        return;
      }

      const success = await deleteVaga(vaga.id);
      if (success) {
        toast({ title: "Vaga excluída com sucesso", className: "bg-[#2D5016] text-white" });
      }
    } catch (error) {
      console.error("Erro ao verificar/excluir vaga:", error);
      toast({ 
        title: "Erro", 
        description: "Ocorreu um erro ao tentar excluir a vaga.", 
        variant: "destructive" 
      });
    }
  };

  const openBlockModal = (data, tipo = 'fechado') => {
    setModalAction('block');
    setModalBlockType(tipo);
    setModalDate(data);
    setModalOpen(true);
  };

  const openUnblockModal = (data) => {
    setModalAction('unblock');
    setModalDate(data);
    setModalOpen(true);
  };

  const executeBlockAction = async () => {
    try {
      if (modalAction === 'unblock') {
        const { error } = await supabase
          .from("bloqueios_agendamento")
          .delete()
          .eq("data_visita", modalDate);

        if (error) throw error;
        toast({ title: "Data reaberta com sucesso" });
      } else {
        const { error } = await supabase
          .from("bloqueios_agendamento")
          .upsert({
            data_visita: modalDate,
            bloqueado: true,
            status: modalBlockType
          });

        if (error) throw error;
        toast({ title: `Data bloqueada como ${modalBlockType}` });
      }
      
      await fetchBloqueios(); 
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setModalOpen(false);
    }
  };

  const handleBulkUnblock = async (startDate, endDate) => {
    setUnblockingBulk(true);
    try {
      await unblockDateRange(startDate, endDate);
      toast({ title: "Bloqueios removidos com sucesso", className: "bg-blue-600 text-white border-none" });
      await fetchBloqueios();
      setShowUnblockModal(false);
    } catch (error) {
      toast({ title: "Erro ao remover bloqueios", description: error.message, variant: "destructive" });
    } finally {
      setUnblockingBulk(false);
    }
  };

  const handleMassBlock = async (e) => {
    e.preventDefault();
    setMassBlocking(true);

    try {
      const { startDate, endDate, status, galeria } = massBlockForm;
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      let current = new Date(start);
      let errors = 0;
      let count = 0;

      while (current <= end) {
        const dataString = current.toISOString().split('T')[0];
        
        const payload = {
          data_visita: dataString,
          bloqueado: true,
          status: status
        };

        if (galeria !== 'Todas') {
          payload.galeria = galeria;
        }

        const { error } = await supabase
          .from("bloqueios_agendamento")
          .upsert(payload);

        if (error) {
          console.error(error);
          errors++;
        } else {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      if (errors > 0) {
        toast({ title: "Atenção", description: `Houve erro ao bloquear algumas datas.`, variant: "destructive" });
      } else {
        toast({ title: `${count} datas bloqueadas com sucesso.`, className: "bg-red-600 text-white border-none" });
      }
      
      await fetchBloqueios();
      setShowMassBlockModal(false);
      setMassBlockForm({ startDate: '', endDate: '', status: 'fechado', galeria: 'Todas' });
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setMassBlocking(false);
    }
  };

  const getBadgeTooltip = (status) => {
    switch(status) {
      case 'fechado': return "Data encerrada para novos agendamentos";
      case 'manutencao': return "Data bloqueada por manutenção";
      case 'feriado': return "Sem agendamentos por feriado";
      case 'seguranca': return "Data bloqueada por motivo de segurança";
      default: return "Data bloqueada";
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filtrar por Tipo</span>
              <Select value={tipoFilter} onValueChange={(val) => { setTipoFilter(val); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-200"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  {options.tiposVisita.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filtrar por Data</span>
              <div className="relative w-full sm:w-[200px]">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 z-10" />
                <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(0); }} className="pl-9 bg-white" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto self-end lg:self-center flex-wrap justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setShowUnblockModal(true)} className="border-blue-600 text-blue-700 font-bold uppercase text-xs h-10">
                  <Unlock className="w-4 h-4 mr-2" /> Desbloquear em Massa
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Remover bloqueios em massa</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setShowMassBlockModal(true)} className="border-red-600 text-red-700 font-bold uppercase text-xs h-10">
                  <Lock className="w-4 h-4 mr-2" /> Bloquear em Massa
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Adicionar bloqueios em massa</p></TooltipContent>
            </Tooltip>
            <Button variant="outline" onClick={() => { resetForm(); setIsBulkMode(true); setIsDialogOpen(true); }} className="border-[#2D5016] text-[#2D5016] font-bold uppercase text-xs h-10"><Layers className="w-4 h-4 mr-2" /> Em Massa</Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold uppercase text-xs h-10"><Plus className="w-4 h-4 mr-2" /> Nova Vaga</Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-3 flex items-center gap-3 bg-blue-50 border-r border-gray-100">
            <Layers className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-900">
              <strong>Em Massa:</strong> crie cronogramas completos para várias datas de uma vez.
            </p>
          </div>
          <div className="flex-1 p-3 flex items-center gap-3 bg-green-50 border-r border-gray-100">
            <Plus className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-900">
              <strong>Nova Vaga:</strong> configuração individual de horários e galerias específicas.
            </p>
          </div>
          <div className="flex-1 p-3 flex items-center gap-3 bg-amber-50">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              Cada <strong>Galeria</strong> possui uma cor de identificação única para facilitar a gestão visual.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-bold text-gray-700">Data/Hora</TableHead>
                <TableHead className="font-bold text-gray-700">Galeria</TableHead>
                <TableHead className="font-bold text-gray-700">Tipo</TableHead>
                <TableHead className="font-bold text-gray-700">Ocupação</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vagasLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto text-[#2D5016]" /></TableCell></TableRow>
              ) : (
                vagas.map((vaga) => (
                  <TableRow key={vaga.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4 font-medium">
                      <div className="text-gray-900 font-bold">{vaga.data_visita ? new Date(vaga.data_visita + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                      <div className="text-[10px] text-gray-500 uppercase flex items-center gap-1 font-mono"><Clock className="w-3 h-3"/> {vaga.horario?.substring(0, 5)}H</div>
                    </TableCell>
                    <TableCell><Badge className={`${galeriaColors[vaga.galeria]} border font-black px-3 py-1`}>{vaga.galeria}</Badge></TableCell>
                    <TableCell className="text-xs font-bold text-gray-600 capitalize">{vaga.tipo_visita?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 w-24">

                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className={vaga.vagas_ocupadas >= vaga.vagas_totais ? 'text-red-600' : 'text-[#2D5016]'}>
                            {vaga.vagas_ocupadas}
                          </span>
                          <span>/ {vaga.vagas_totais}</span>
                        </div>

                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2D5016]"
                            style={{ width: `${(vaga.vagas_ocupadas / vaga.vagas_totais) * 100}%` }}
                          />
                        </div>

                        <div className="flex gap-1 flex-wrap mt-1">
                          {(() => {
                            const dataKey = vaga.data_visita?.slice(0, 10);
                            const bloqueio = bloqueiosMap[dataKey];

                            return bloqueio && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className={cn(
                                      "text-[9px] px-2 py-0 cursor-help",
                                      bloqueio.status === 'fechado' && "bg-red-100 text-red-700",
                                      bloqueio.status === 'manutencao' && "bg-yellow-100 text-yellow-700",
                                      bloqueio.status === 'feriado' && "bg-blue-100 text-blue-700",
                                      bloqueio.status === 'seguranca' && "bg-purple-100 text-purple-700"
                                    )}
                                  >
                                    {bloqueio.status}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getBadgeTooltip(bloqueio.status)}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}

                          {vaga.vagas_ocupadas >= vaga.vagas_totais && (
                            <span className="text-[9px] text-red-600 font-bold">
                              LOTADO
                            </span>
                          )}

                          {vaga.vagas_ocupadas === 0 && (
                            <span className="text-[9px] text-gray-400 font-bold">
                              VAZIO
                            </span>
                          )}
                        </div>

                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right space-x-1">
                      <div className="flex gap-1 justify-end mb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => openUnblockModal(vaga.data_visita)} className="h-8 w-8 p-0">
                              🔓
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Reabrir data para agendamentos</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => openBlockModal(vaga.data_visita, 'fechado')}>
                              🔒
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Bloquear como encerrado</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-yellow-50" onClick={() => openBlockModal(vaga.data_visita, 'manutencao')}>
                              🛠
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Bloquear por manutenção</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-blue-50" onClick={() => openBlockModal(vaga.data_visita, 'feriado')}>
                              🎉
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Bloquear como feriado</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-purple-50" onClick={() => openBlockModal(vaga.data_visita, 'seguranca')}>
                              🛡
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Bloquear por segurança</p></TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex justify-end gap-1 mt-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingVaga(null); setFormData({...vaga}); setIsDialogOpen(true); }} className="text-amber-600 hover:bg-amber-50 h-8 w-8 p-0">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Duplicar vaga</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingVaga(vaga); setFormData({...vaga}); setIsDialogOpen(true); }} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Editar vaga</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteVaga(vaga)} className="text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Excluir vaga</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Total: <span className="text-gray-900 font-bold">{total}</span> vagas</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || vagasLoading}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-bold text-[#2D5016] bg-green-50 px-3 py-1 rounded-md border border-green-100">Página {page + 1} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total || vagasLoading}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[80px] h-8 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
          <DialogContent className="bg-white border-0 max-w-xl rounded-xl shadow-2xl p-0 overflow-hidden">
            <DialogHeader className={`p-6 text-white ${isBulkMode ? 'bg-[#2D5016]' : editingVaga ? 'bg-blue-600' : 'bg-[#2D5016]'}`}>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
                {isBulkMode ? <Layers className="w-5 h-5"/> : editingVaga ? <Pencil className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                {isBulkMode ? 'Criação em Massa' : editingVaga ? 'Editar Vaga' : 'Nova Vaga'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">{isBulkMode ? 'Data Início' : 'Data'}</label>
                    <Input type="date" value={formData.data_visita} onChange={(e) => setFormData({...formData, data_visita: e.target.value})} required className="h-10 bg-white" />
                  </div>
                  {isBulkMode ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Data Fim</label>
                      <Input type="date" value={formData.data_fim} onChange={(e) => setFormData({...formData, data_fim: e.target.value})} required className="h-10 bg-white" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Horário</label>
                      <Input type="time" value={formData.horario} onChange={(e) => setFormData({...formData, horario: e.target.value})} required className="h-10 bg-white" />
                    </div>
                  )}
                </div>

                {isBulkMode && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Dias da Semana</label>
                    <div className="flex justify-between gap-1">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, idx) => (
                        <button
                          key={idx} type="button"
                          onClick={() => handleDayToggle(idx)}
                          className={cn(
                            "w-9 h-9 rounded-md text-xs font-bold transition-all border",
                            formData.dias_semana.includes(idx) 
                              ? "bg-[#2D5016] text-white border-[#2D5016]" 
                              : "bg-white text-gray-400 border-gray-200"
                          )}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Horário Padrão</label>
                      <Input type="time" value={formData.horario} onChange={(e) => setFormData({...formData, horario: e.target.value})} required className="h-10 bg-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Tipo de Visita</label>
                  <Select value={formData.tipo_visita} onValueChange={(v) => setFormData({...formData, tipo_visita: v})}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {options.tiposVisita.map(t => <SelectItem key={t.codigo} value={t.codigo}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Galeria</label>
                    <Select value={formData.galeria} onValueChange={(v) => setFormData({...formData, galeria: v})}>
                      <SelectTrigger className="h-10 bg-white font-bold"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent className="bg-white font-bold">
                        {['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Vagas</label>
                    <Input type="number" value={formData.vagas_totais} onChange={(e) => setFormData({...formData, vagas_totais: e.target.value})} className="h-10 bg-white font-bold" />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-xs font-bold uppercase">Cancelar</Button>
                <Button type="submit" disabled={saving} className={cn(
                  "px-8 font-black text-xs uppercase tracking-widest text-white",
                  editingVaga ? "bg-blue-600 hover:bg-blue-700" : "bg-[#2D5016] hover:bg-[#1f3810]"
                )}>
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : isBulkMode ? 'Gerar Vagas' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmBlockModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={executeBlockAction}
          actionType={modalAction}
          blockType={modalBlockType}
          date={modalDate}
        />

        <UnblockDatesModal 
          isOpen={showUnblockModal}
          onClose={() => setShowUnblockModal(false)}
          onConfirm={handleBulkUnblock}
        />

        <Dialog open={showMassBlockModal} onOpenChange={(open) => { setShowMassBlockModal(open); if(!open) setMassBlockForm({ startDate: '', endDate: '', status: 'fechado', galeria: 'Todas' }); }}>
          <DialogContent className="bg-white border-0 max-w-md rounded-xl shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="bg-red-600 p-6 text-white">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
                <Lock className="w-5 h-5"/> Bloqueio em Massa
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMassBlock} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Data Início</label>
                  <Input type="date" required value={massBlockForm.startDate} onChange={(e) => setMassBlockForm({...massBlockForm, startDate: e.target.value})} className="h-10 bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Data Fim</label>
                  <Input type="date" required value={massBlockForm.endDate} onChange={(e) => setMassBlockForm({...massBlockForm, endDate: e.target.value})} className="h-10 bg-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Tipo de Bloqueio</label>
                <Select value={massBlockForm.status} onValueChange={(v) => setMassBlockForm({...massBlockForm, status: v})}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="fechado">Encerrado</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="feriado">Feriado</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Galeria (Opcional)</label>
                <Select value={massBlockForm.galeria} onValueChange={(v) => setMassBlockForm({...massBlockForm, galeria: v})}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Todas">Todas as Galerias</SelectItem>
                    {['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>Galeria {l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4 border-t gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowMassBlockModal(false)} className="text-xs font-bold uppercase">Cancelar</Button>
                <Button type="submit" disabled={massBlocking} className="px-8 font-black text-xs uppercase tracking-widest text-white bg-red-600 hover:bg-red-700">
                  {massBlocking ? <Loader2 className="animate-spin w-4 h-4" /> : 'Bloquear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default VagasManagement;
