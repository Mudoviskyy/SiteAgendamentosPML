import React, { useEffect, useState, useCallback } from 'react';
import { formatarHorasMinutos } from '@/lib/utils';
import { Helmet } from 'react-helmet';

import { useRemuneradosAdmin } from '../../hooks/useRemuneradosAdmin';

import CancelServiceModal from '../../components/CancelServiceModal';
import RescheduleServiceModal from '../../components/RescheduleServiceModal';
import RefusalModal from '../../components/RefusalModal';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { ClipboardCheck, Check, X, Loader2, CalendarClock, Ban, Search, Filter, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ServidorInfo = ({ nome, matricula, plantao }) => (
  <TableCell>
    <div className="flex items-center gap-2">
      <div className="font-medium">{nome}</div>
      {plantao && (
        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
          {plantao}
        </Badge>
      )}
    </div>
    <div className="text-xs text-gray-500">{matricula}</div>
  </TableCell>
);

const RemuneradosApprovalManagement = () => {
  const hooks = useRemuneradosAdmin();
  const {
    fetchAllServicos, updateApprovalStatus, cancelarServico, reagendarServico,
    fetchSolicitacoesAdmin, aprovarSolicitacaoHoras, recusarSolicitacaoHoras,

    fetchUsoHorasAdmin,
    aprovarUsoHoras,
    recusarUsoHoras,

    loading
  } = hooks;

  const [servicos, setServicos] = useState([]);
  const [solicitacoesHoras, setSolicitacoesHoras] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const [usoHoras, setUsoHoras] = useState([]);

  // Modals state
  const [selectedService, setSelectedService] = useState(null);
  const [selectedHoras, setSelectedHoras] = useState(null);
  const [selectedUso, setSelectedUso] = useState(null);
  const [modalType, setModalType] = useState(null);

  // Estados de Filtro
  const [searchNome, setSearchNome] = useState('');
  const [searchMatricula, setSearchMatricula] = useState('');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [anoFiltro, setAnoFiltro] = useState('todos');
  const [dataFiltro, setDataFiltro] = useState('');
  const [plantaoFiltro, setPlantaoFiltro] = useState('todos');

  // Estados de Paginação
  const [pages, setPages] = useState({
    rd_p: 1, rd_h: 1,
    bh_p: 1, bh_h: 1,
    uso_p: 1, uso_h: 1
  });
  const ITEMS_PER_PAGE = 10;

  const updatePage = (key, val) => setPages(prev => ({ ...prev, [key]: val }));

  // Resetar páginas ao filtrar
  useEffect(() => {
    setPages({ rd_p: 1, rd_h: 1, bh_p: 1, bh_h: 1, uso_p: 1, uso_h: 1 });
  }, [searchNome, searchMatricula, mesFiltro, anoFiltro, dataFiltro]);

  const loadData = useCallback(async () => {
    const resRD = await fetchAllServicos();
    if (resRD && resRD.success) setServicos(resRD.data || []);

    const resBH = await fetchSolicitacoesAdmin();
    if (resBH && resBH.success) setSolicitacoesHoras(resBH.data || []);

    // NOVO
    const resUso = await fetchUsoHorasAdmin();
    if (resUso && resUso.success) setUsoHoras(resUso.data || []);

  }, [fetchAllServicos, fetchSolicitacoesAdmin, fetchUsoHorasAdmin]);

  const usoPendentes = usoHoras.filter(s => s.status === 'pendente');
  const usoHistorico = usoHoras.filter(s => s.status !== 'pendente');

  useEffect(() => {
    loadData();
  }, [loadData]);

  // RD / RN actions
  const handleAprovarServico = async (id) => {
    setProcessingId(id);
    await updateApprovalStatus(id, 'aprovado', 'Aprovado');
    setProcessingId(null);
    loadData();
  };

  const handleRecusarServico = (id) => {
    setProcessingId(id);
    setModalType('refuse_service');
  };

  const handleConfirmRefuseService = async (motivo) => {
    if (processingId) {
      await updateApprovalStatus(processingId, 'recusado', motivo);
      setModalType(null);
      setProcessingId(null);
      loadData();
    }
  };

  const handleConfirmCancel = async (id, motivo) => {
    const result = await cancelarServico(id, motivo);
    if (result.success) {
      setModalType(null);
      setSelectedService(null);
      loadData();
    }
  };

  const handleConfirmReschedule = async (id, novaData, motivo) => {
    const result = await reagendarServico(id, novaData, motivo);
    if (result.success) {
      setModalType(null);
      setSelectedService(null);
      loadData();
    }
  };

  const rdPendentes = servicos.filter(s => s.status === 'pendente');
  const rdAprovados = servicos.filter(s => s.status === 'aprovado');

  // BANCO HORAS
  const bhPendentes = solicitacoesHoras.filter(s => s.status === 'pendente');
  const bhHistorico = solicitacoesHoras.filter(s => s.status !== 'pendente');

  const handleAprovarHoras = async (sol) => {
    setProcessingId(sol.id);
    await aprovarSolicitacaoHoras(sol.id, sol.servidor_id, sol.horas);
    setProcessingId(null);
    loadData();
  };

  const handleRecusarHoras = (sol) => {
    setSelectedHoras(sol);
    setModalType('refuse_horas');
  };

  const handleConfirmRefuseHoras = async (motivo) => {
    if (selectedHoras) {
      setProcessingId(selectedHoras.id);
      await recusarSolicitacaoHoras(selectedHoras.id, motivo);
      setProcessingId(null);
      setModalType(null);
      setSelectedHoras(null);
      loadData();
    }
  };

  const handleAprovarUso = async (sol) => {
    setProcessingId(sol.id);
    await aprovarUsoHoras(sol);
    setProcessingId(null);
    loadData();
  };

  const handleRecusarUso = (id) => {
    setProcessingId(id);
    setModalType('refuse_uso');
  };

  const handleConfirmRefuseUso = async (motivo) => {
    if (processingId) {
      await recusarUsoHoras(processingId);
      setProcessingId(null);
      setModalType(null);
      loadData();
    }
  };

  // Lógica de Filtragem Universal
  const applyFilters = (list, dateKey = 'data') => {
    return list.filter(item => {
      const matchNome = !searchNome || item.servidor_nome?.toLowerCase().includes(searchNome.toLowerCase());
      const matchMatricula = !searchMatricula || item.servidor_matricula?.includes(searchMatricula);

      const itemDate = new Date(item[dateKey] + (dateKey === 'data' || dateKey === 'data_uso' ? 'T12:00:00Z' : ''));
      const m = (itemDate.getMonth() + 1).toString();
      const y = itemDate.getFullYear().toString();

      const matchMes = mesFiltro === 'todos' || m === mesFiltro;
      const matchAno = anoFiltro === 'todos' || y === anoFiltro;
      const matchPlantao = plantaoFiltro === 'todos' || item.servidor_plantao === plantaoFiltro;
      const matchData = !dataFiltro || item[dateKey]?.startsWith(dataFiltro);

      return matchNome && matchMatricula && matchMes && matchAno && matchPlantao && matchData;
    });
  };

  // Listas Filtradas
  const f_rdPendentes = applyFilters(servicos.filter(s => s.status === 'pendente'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const f_rdAprovados = applyFilters(servicos.filter(s => s.status === 'aprovado' || s.status === 'reagendado'));
  const f_bhPendentes = applyFilters(solicitacoesHoras.filter(s => s.status === 'pendente'), 'created_at')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const f_bhHistorico = applyFilters(solicitacoesHoras.filter(s => s.status !== 'pendente'), 'created_at');
  const f_usoPendentes = applyFilters(usoHoras.filter(s => s.status === 'pendente'), 'data_uso')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const f_usoHistorico = applyFilters(usoHoras.filter(s => s.status !== 'pendente'), 'data_uso');

  // Helper para renderizar barra de filtros
  const renderFilterBar = () => (
    <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Nome do servidor..."
          className="pl-9"
          value={searchNome}
          onChange={e => setSearchNome(e.target.value)}
        />
      </div>
      <div className="relative">
        <Input
          placeholder="Matrícula..."
          value={searchMatricula}
          onChange={e => setSearchMatricula(e.target.value)}
        />
      </div>
      <div className="relative">
        <Input
          type="date"
          value={dataFiltro}
          onChange={e => setDataFiltro(e.target.value)}
          className="cursor-pointer"
        />
      </div>
      <Select value={mesFiltro} onValueChange={setMesFiltro}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Meses</SelectItem>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i + 1} value={(i + 1).toString()}>
              {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={anoFiltro} onValueChange={setAnoFiltro}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Anos</SelectItem>
          {[2024, 2025, 2026].map(y => (
            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={plantaoFiltro} onValueChange={setPlantaoFiltro}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="Plantão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Plantões</SelectItem>
          <SelectItem value="A">Plantão A</SelectItem>
          <SelectItem value="B">Plantão B</SelectItem>
          <SelectItem value="C">Plantão C</SelectItem>
          <SelectItem value="D">Plantão D</SelectItem>
          <SelectItem value="Administrativo">Administrativo</SelectItem>
          <SelectItem value="Outras Unidades">Outras Unidades</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // Helper para renderizar paginação
  const renderPagination = (key, totalItems) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <span className="text-xs text-gray-500 font-medium">
          Página {pages[key]} de {totalPages} ({totalItems} registros)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            disabled={pages[key] === 1}
            onClick={() => updatePage(key, pages[key] - 1)}
            className="h-8 text-xs"
          >
            Anterior
          </Button>
          <Button
            variant="outline" size="sm"
            disabled={pages[key] === totalPages}
            onClick={() => updatePage(key, pages[key] + 1)}
            className="h-8 text-xs"
          >
            Próxima
          </Button>
        </div>
      </div>
    );
  };

  const getPaginatedItems = (list, pageKey) => {
    const start = (pages[pageKey] - 1) * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Aprovações - Remunerados</title></Helmet>

      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardCheck className="w-6 h-6 text-[#2D5016]" />
        Gestão de Aprovações
      </h1>

      <Tabs defaultValue="rd">
        <TabsList className="bg-white border mb-4">
          <TabsTrigger value="rd">Plantões RD/RN</TabsTrigger>
          <TabsTrigger value="banco">Banco de Horas</TabsTrigger>
        </TabsList>

        <TabsContent value="rd" className="mt-0">
          <Tabs defaultValue="pendentes_rd">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <TabsList>
                <TabsTrigger value="pendentes_rd">Pendentes</TabsTrigger>
                <TabsTrigger value="aprovados_rd">Aprovados</TabsTrigger>
              </TabsList>
            </div>

            {renderFilterBar()}

            <TabsContent value="pendentes_rd" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>Orientação:</strong> As solicitações são apresentadas por ordem de quem pediu antes para quem pediu mais tarde.
                </p>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && f_rdPendentes.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : f_rdPendentes.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">Nenhuma solicitação encontrada.</TableCell></TableRow>
                  ) : (
                    getPaginatedItems(f_rdPendentes, 'rd_p').map((s) => (
                      <TableRow key={s.id}>
                        <ServidorInfo nome={s.servidor_nome} matricula={s.servidor_matricula} plantao={s.servidor_plantao} />
                        <TableCell>{format(new Date(s.data + 'T12:00:00Z'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge variant="outline">{s.tipo}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-600 font-medium">{s.turno || '-'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" onClick={() => handleAprovarServico(s.id)} disabled={processingId === s.id} className="bg-emerald-600 hover:bg-emerald-700">
                            {processingId === s.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRecusarServico(s.id)} disabled={processingId === s.id}>
                            <X className="w-4 h-4 mr-1" /> Recusar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination('rd_p', f_rdPendentes.length)}
            </TabsContent>

            <TabsContent value="aprovados_rd" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f_rdAprovados.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">Nenhum serviço encontrado.</TableCell></TableRow>
                  ) : (
                    getPaginatedItems(f_rdAprovados, 'rd_h').map((s) => (
                      <TableRow key={s.id}>
                        <ServidorInfo nome={s.servidor_nome} matricula={s.servidor_matricula} plantao={s.servidor_plantao} />
                        <TableCell>{format(new Date(s.data + 'T12:00:00Z'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{s.tipo}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-600 font-medium">{s.turno || '-'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedService(s); setModalType('reschedule'); }} disabled={processingId === s.id}>
                            <CalendarClock className="w-4 h-4 mr-1 text-blue-600" /> Alterar Data
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedService(s); setModalType('cancel'); }} disabled={processingId === s.id}>
                            <Ban className="w-4 h-4 mr-1" /> Cancelar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination('rd_h', f_rdAprovados.length)}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="banco" className="mt-0">
          <Tabs defaultValue="pendentes">
            <TabsList className="mb-4">
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="uso">Uso de Horas</TabsTrigger>
            </TabsList>

            {renderFilterBar()}

            <TabsContent value="pendentes" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>Orientação:</strong> As solicitações são apresentadas por ordem de quem pediu antes para quem pediu mais tarde.
                </p>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f_bhPendentes.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-8">Nenhuma solicitação encontrada.</TableCell></TableRow>
                  ) : (
                    getPaginatedItems(f_bhPendentes, 'bh_p').map((sol) => (
                      <TableRow key={sol.id}>
                        <ServidorInfo nome={sol.servidor_nome} matricula={sol.servidor_matricula} plantao={sol.servidor_plantao} />
                        <TableCell className="font-bold text-blue-600">{formatarHorasMinutos(sol.horas)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={sol.motivo}>{sol.motivo}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAprovarHoras(sol)} disabled={processingId === sol.id}>
                            <Check className="w-4 h-4 mr-1" /> Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRecusarHoras(sol)} disabled={processingId === sol.id}>
                            <X className="w-4 h-4 mr-1" /> Recusar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination('bh_p', f_bhPendentes.length)}
            </TabsContent>

            <TabsContent value="historico" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f_bhHistorico.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : (
                    getPaginatedItems(f_bhHistorico, 'bh_h').map((sol) => (
                      <TableRow key={sol.id}>
                        <ServidorInfo nome={sol.servidor_nome} matricula={sol.servidor_matricula} plantao={sol.servidor_plantao} />
                        <TableCell className="font-medium">{formatarHorasMinutos(sol.horas)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sol.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                            {sol.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination('bh_h', f_bhHistorico.length)}
            </TabsContent>


            <TabsContent value="uso" className="mt-0">
              <Tabs defaultValue="uso_pendentes">

                <TabsList className="mb-4">
                  <TabsTrigger value="uso_pendentes">Pendentes</TabsTrigger>
                  <TabsTrigger value="uso_historico">Histórico</TabsTrigger>
                </TabsList>

                {/* ================= PENDENTES ================= */}
                <TabsContent value="uso_pendentes" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      <strong>Orientação:</strong> As solicitações são apresentadas por ordem de quem pediu antes para quem pediu mais tarde.
                    </p>
                  </div>
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Servidor</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Data Uso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {f_usoPendentes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Nenhuma solicitação encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedItems(f_usoPendentes, 'uso_p').map((sol) => (
                          <TableRow key={sol.id}>
                            <ServidorInfo nome={sol.servidor_nome} matricula={sol.servidor_matricula} plantao={sol.servidor_plantao} />

                            <TableCell className="font-bold text-red-600">
                              {formatarHorasMinutos(sol.horas)}
                            </TableCell>

                            <TableCell>
                              {sol.data_uso
                                ? format(new Date(sol.data_uso + 'T12:00:00Z'), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>

                            <TableCell>
                              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                PENDENTE
                              </Badge>
                            </TableCell>

                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                disabled={processingId === sol.id}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                onClick={() => handleAprovarUso(sol)}
                              >
                                {processingId === sol.id ? "..." : "Aprovar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processingId === sol.id}
                                className="disabled:opacity-50"
                                onClick={() => handleRecusarUso(sol.id)}
                              >
                                {processingId === sol.id ? "..." : "Recusar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {renderPagination('uso_p', f_usoPendentes.length)}
                </TabsContent>

                {/* ================= HISTÓRICO ================= */}
                <TabsContent value="uso_historico" className="bg-white border rounded-xl shadow-sm p-0 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Servidor</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Data Uso</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {f_usoHistorico.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            Nenhum registro encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedItems(f_usoHistorico, 'uso_h').map((sol) => (
                          <TableRow key={sol.id}>
                            <ServidorInfo nome={sol.servidor_nome} matricula={sol.servidor_matricula} plantao={sol.servidor_plantao} />

                            <TableCell className="font-medium text-red-600">
                              {formatarHorasMinutos(sol.horas)}
                            </TableCell>

                            <TableCell>
                              {sol.data_uso
                                ? format(new Date(sol.data_uso + 'T12:00:00Z'), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={
                                  sol.status === 'aprovado'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }
                              >
                                {sol.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {renderPagination('uso_h', f_usoHistorico.length)}
                </TabsContent>

              </Tabs>
            </TabsContent>


          </Tabs>
        </TabsContent>
      </Tabs>

      <CancelServiceModal
        isOpen={modalType === 'cancel'}
        onClose={() => { setModalType(null); setSelectedService(null); }}
        service={selectedService}
        onConfirm={handleConfirmCancel}
        isLoading={loading}
      />

      <RescheduleServiceModal
        isOpen={modalType === 'reschedule'}
        onClose={() => { setModalType(null); setSelectedService(null); }}
        service={selectedService}
        onConfirm={handleConfirmReschedule}
        isLoading={loading}
      />

      <RefusalModal
        isOpen={modalType === 'refuse_service'}
        onClose={() => { setModalType(null); setProcessingId(null); }}
        onConfirm={handleConfirmRefuseService}
        title="Recusar Plantão RD/RN"
        loading={loading}
      />

      <RefusalModal
        isOpen={modalType === 'refuse_horas'}
        onClose={() => { setModalType(null); setSelectedHoras(null); }}
        onConfirm={handleConfirmRefuseHoras}
        title="Recusar Crédito de Horas"
        loading={loading}
      />

      <RefusalModal
        isOpen={modalType === 'refuse_uso'}
        onClose={() => { setModalType(null); setProcessingId(null); }}
        onConfirm={handleConfirmRefuseUso}
        title="Recusar Uso de Horas"
        loading={loading}
      />
    </div>
  );
};

export default RemuneradosApprovalManagement;