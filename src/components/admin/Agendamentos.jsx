import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { addLog, measurePerf } from '@/utils/logger'; // ✅ Importando logger
import { Search, Loader2, CheckCircle, XCircle, AlertTriangle, Calendar, ChevronLeft, ChevronRight, Info, History, ShieldCheck, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import ImportarPresosPDF from './ImportarPresosPDF';
const AgendamentosAdmin = () => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [mapaMensal, setMapaMensal] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [dataVisitaFiltro, setDataVisitaFiltro] = useState('');
  const [tipoVisitaFiltro, setTipoVisitaFiltro] = useState('todos');
  const [galeriaFiltro, setGaleriaFiltro] = useState('todos');

  const [activeTab, setActiveTab] = useState('agendamentos');
  const [filas, setFilas] = useState([]);
  const [totalFilas, setTotalFilas] = useState(0);

  const [validacaoPreso, setValidacaoPreso] = useState({ loading: false, data: null });
  const [alertasVisitante, setAlertasVisitante] = useState({ loading: false, data: null });

  // Paginação 
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const parseUTC = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
  };

  const normalizeCheck = (text) => {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  };
  // Modais 
  const [actionModal, setActionModal] = useState({ isOpen: false, agendamento: null, actionType: null });
  const [motivo, setMotivo] = useState('');
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, data: null });
  const { toast } = useToast();
  const currentTotal = activeTab === 'agendamentos' ? total : totalFilas;
  const totalPages = Math.ceil(currentTotal / pageSize);
  const mensagensPadraoAgendamento = [
    "Limite mensal de visitas atingido para o Interno informado.",
    "Matricula do interno informada está errada.",
    "Não Existe vínculo legal com um ou mais visitantes informados.",
    "O Comportamento do detento não está como 'BOM'. Não pode ter visita íntima.",
    "O detento já possui 2 visitas íntimas agendadas.",
    "O detento já possui 3 visitas sociais agendadas.",
    "O detento já usufrui do direito de um amigo(a) vinculado.",
    "O detento mudou para a galeria [ ]",
    "O detento pode ter visita íntima somente após 60 dias da entrada na unidade.",
    "O Interno informado não está mais neste Presídio.",
    "O Visitante [ ] não possui Carteira de Visitante / Vínculo com o detento.",
    "Sua Carteirinha vencerá dia [ ]. Envie a documentação pelo seu portal. Dúvidas Via WhatsApp",
    "Visitante acompanhantes não tem uma carterinha válida.",
  ];

  // --- LÓGICA DE CONTAGEM MENSAL --- 
  const fetchControleMensal = useCallback(async () => {
    // 🚀 Monitorando performance da View de controle mensal
    const { data, error } = await measurePerf('FETCH_CONTROLE_MENSAL', async () => {
      return await supabase.from('view_controle_visitas_mensal').select('*');
    });

    if (error) {
      addLog('ERRO_CONTROLE_MENSAL', { error }, 'ERROR');
      console.error("Erro no controle mensal:", error);
      return;
    }
    const mapa = {};

    (data || []).forEach(r => {
      const chave = `${r.matricula_preso}_${r.mes_ref}`;
      mapa[chave] = { sociais: r.sociais, intimas: r.intimas };
    });
    setMapaMensal(mapa);
  }, []);

  // --- BUSCA DE AGENDAMENTOS --- 
  const fetchAgendamentos = useCallback(async () => {
    setLoading(true);
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // 🚀 Medindo performance da busca paginada e filtros
    try {
      const result = await measurePerf('FETCH_AGENDAMENTOS_ADMIN', async () => {
        let query = supabase
          .from('agendamentos')
          .select(` 
            *, 
            vagas_configuracao!inner (data_visita, horario, galeria, tipo_visita),
            perfis ( carteirinhas ( parentesco, matricula_preso, menor_idade ) )
          `, { count: 'exact' });

        if (statusFiltro === 'todos') {
          query = query
            .order('status', { ascending: false })
            .order('created_at', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: true });
        }

        if (statusFiltro !== 'todos') query = query.eq('status', statusFiltro);
        if (search) {
          // Ajustado para colunas reais da tabela agendamentos
          query = query.or(`matricula_preso.ilike.%${search}%,visitante1_nome.ilike.%${search}%,nome_preso.ilike.%${search}%,visitante1_carteirinha.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (dataVisitaFiltro) {
          query = query.eq('vagas_configuracao.data_visita', dataVisitaFiltro);
        }
        if (tipoVisitaFiltro !== 'todos') {
          query = query.ilike('vagas_configuracao.tipo_visita', `%${tipoVisitaFiltro}%`);
        }
        if (galeriaFiltro !== 'todos') {
          query = query.eq('vagas_configuracao.galeria', galeriaFiltro);
        }

        query = query.range(from, to);
        return await query;
      });

      if (!result.error) {
        setAgendamentos(result.data || []);
        setTotal(result.count || 0);
        addLog('AGENDAMENTOS_LOADED', { count: result.data?.length, total: result.count }, 'SUCCESS');
      } else {
        throw result.error;
      }
    } catch (error) {
      addLog('ERROR_FETCH_AGENDAMENTOS', { error: error.message }, 'ERROR');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFiltro, search, dataVisitaFiltro, tipoVisitaFiltro, galeriaFiltro]);

  // --- BUSCA DE FILAS DE ESPERA --- 
  const fetchFilas = useCallback(async () => {
    setLoading(true);
    const from = page * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('fila_espera')
        .select(`
          *,
          vagas_configuracao!inner(data_visita, horario, galeria, tipo_visita),
          perfis!inner(nome, telefone)
        `, { count: 'exact' });

      if (statusFiltro !== 'todos') {
        query = query.eq('status', statusFiltro);
      }

      query = query.order('created_at', { ascending: true });

      if (search) {
        query = query.or(`matricula_preso.ilike.%${search}%,nome_preso.ilike.%${search}%,perfis.nome.ilike.%${search}%`);
      }
      if (dataVisitaFiltro) {
        query = query.eq('vagas_configuracao.data_visita', dataVisitaFiltro);
      }
      if (tipoVisitaFiltro !== 'todos') {
        query = query.ilike('vagas_configuracao.tipo_visita', `%${tipoVisitaFiltro}%`);
      }
      if (galeriaFiltro !== 'todos') {
        query = query.eq('vagas_configuracao.galeria', galeriaFiltro);
      }

      query = query.range(from, to);
      const result = await query;

      if (!result.error) {
        setFilas(result.data || []);
        setTotalFilas(result.count || 0);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("Erro fetch filas", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFiltro, search, dataVisitaFiltro, tipoVisitaFiltro, galeriaFiltro]);

  useEffect(() => {
    if (activeTab === 'agendamentos') {
      addLog('AGENDAMENTOS_ADMIN_MOUNTED', { page, statusFiltro });
      fetchAgendamentos();
      fetchControleMensal();
    } else {
      fetchFilas();
    }
  }, [activeTab, fetchAgendamentos, fetchControleMensal, fetchFilas]);

  // --- VALIDAÇÃO CONTRA BASE PDF ---
  useEffect(() => {
    const checkValidacao = async () => {
      if (detailsModal.isOpen && detailsModal.data?.matricula_preso) {
        setValidacaoPreso({ loading: true, data: null });
        try {
          const { data, error } = await supabase
            .from('base_pdf')
            .select('*')
            .eq('matricula', detailsModal.data.matricula_preso)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const nomeAgendamento = normalizeCheck(detailsModal.data.nome_preso);
            const nomeBase = normalizeCheck(data.nome);
            setValidacaoPreso({
              loading: false,
              data: { ...data, conferido: nomeAgendamento === nomeBase }
            });
          } else {
            setValidacaoPreso({ loading: false, data: null });
          }
        } catch (err) {
          console.error("Erro validacao:", err);
          setValidacaoPreso({ loading: false, data: null });
        }
      }
    };
    checkValidacao();
  }, [detailsModal.isOpen, detailsModal.data]);

  // --- ALERTAS DO VISITANTE (MÚLTIPLAS FALTAS / CRUZADOS) ---
  useEffect(() => {
    const checkAlertas = async () => {
      if (detailsModal.isOpen && detailsModal.data?.visitante1_nome) {
        setAlertasVisitante({ loading: true, data: null });
        try {
          const { data, error } = await supabase.rpc('check_alertas_visitante', {
            p_nome_visitante: normalizeCheck(detailsModal.data.visitante1_nome)
          });
          if (error) throw error;
          setAlertasVisitante({ loading: false, data });
        } catch (err) {
          console.error("Erro ao buscar alertas:", err);
          setAlertasVisitante({ loading: false, data: null });
        }
      }
    };
    checkAlertas();
  }, [detailsModal.isOpen, detailsModal.data]);

  const executeAction = async (id, novoStatus, motivoRecusa = null) => {
    setActionLoading(true);
    const finalStatus = novoStatus === 'recusado' ? 'cancelado' : novoStatus;

    addLog('EXECUTE_ACTION_START', { id, novoStatus, finalStatus, motivoRecusa }, 'INFO');

    // 🚀 Medindo performance da atualização de status
    const { error } = await measurePerf(`UPDATE_STATUS_AGENDAMENTO_${id}`, async () => {
      return await supabase
        .from('agendamentos')
        .update({ status: finalStatus, motivo_recusa: motivoRecusa })
        .eq('id', id);
    });

    if (!error) {
      addLog('EXECUTE_ACTION_SUCCESS', { id, finalStatus }, 'SUCCESS');
      toast({
        title: `Agendamento ${finalStatus === 'aprovado' ? 'Aprovado' : 'Cancelado'}`,
        className: "bg-[#2D5016] text-white"
      });
      fetchAgendamentos();
      fetchControleMensal();
      setActionModal({ isOpen: false, agendamento: null, actionType: null });
      setMotivo('');
    } else {
      addLog('EXECUTE_ACTION_FAILED', { id, error: error.message }, 'ERROR');
    }
    setActionLoading(false);
  };

  const formatarTelefone = (tel) => {
    if (!tel) return "Não informado";
    const limpo = String(tel).replace(/\D/g, "");
    if (limpo.length === 11) return limpo.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    return tel;
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return "Não informado";
    const limpo = String(cpf).replace(/\D/g, "");
    if (limpo.length !== 11) return cpf;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar apenado, matrícula ou visitante..."
            className="pl-8 bg-white text-gray-900 border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
          <Input
            type="date"
            className="w-full sm:w-[150px] bg-white text-gray-900 border-gray-200"
            value={dataVisitaFiltro}
            onChange={(e) => setDataVisitaFiltro(e.target.value)}
          />
          <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white text-gray-900 border-gray-200"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="todos">Todos Status</SelectItem>
              {activeTab === 'agendamentos' && (
                <>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </>
              )}
              {activeTab === 'filas' && (
                <>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="promovido">Promovidos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Select value={tipoVisitaFiltro} onValueChange={(v) => { setTipoVisitaFiltro(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white text-gray-900 border-gray-200"><SelectValue placeholder="Tipo Visita" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="intima">Íntima</SelectItem>
            </SelectContent>
          </Select>
          <Select value={galeriaFiltro} onValueChange={(v) => { setGaleriaFiltro(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[120px] bg-white text-gray-900 border-gray-200"><SelectValue placeholder="Galeria" /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="todos">Galerias</SelectItem>
              <SelectItem value="A">Galeria A</SelectItem>
              <SelectItem value="B">Galeria B</SelectItem>
              <SelectItem value="C">Galeria C</SelectItem>
              <SelectItem value="D">Galeria D</SelectItem>
              <SelectItem value="E">Galeria E</SelectItem>
            </SelectContent>
          </Select>
          <ImportarPresosPDF onComplete={() => activeTab === 'agendamentos' ? fetchAgendamentos() : fetchFilas()} />
        </div>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setPage(0);
          setStatusFiltro('todos'); // Reseta status pois os labels não são 100% compatíveis
        }}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-2">
          <TabsList className="bg-gray-200/50 p-1 rounded-xl">
            <TabsTrigger value="agendamentos" className="rounded-lg font-bold data-[state=active]:bg-[#2D5016] data-[state=active]:text-white">Agendamentos</TabsTrigger>
            <TabsTrigger value="filas" className="rounded-lg font-bold data-[state=active]:bg-[#2D5016] data-[state=active]:text-white">Filas de Espera</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="agendamentos" className="space-y-4 mt-0">
          {/* BANNER DE ORIENTAÇÃO */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="flex-1 p-3 flex items-center gap-3 bg-blue-50 border-r border-gray-100">
              <History className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-900 leading-relaxed">
                Os agendamentos <strong>PENDENTES</strong> são organizados do mais antigo para o mais recente.
                O status Pendente <span className="font-bold">segura a vaga</span> para o interno.
              </p>
            </div>
            <div className="flex-1 p-3 flex items-center gap-3 bg-green-50 border-r border-gray-100">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-xs text-green-900 leading-relaxed">
                <strong>APROVAR</strong> consome a vaga e atualiza o limite mensal de visitas.
                <strong>RECUSAR/CANCELAR</strong> libera a vaga imediatamente para o sistema.
              </p>
            </div>
            <div className="flex-[0.5] p-3 flex items-center gap-3 bg-gray-50">
              <Info className="w-5 h-5 text-gray-600 shrink-0" />
              <p className="text-xs text-gray-600">
                Acesse <span className="font-bold underline">DETALHES</span> para informações complementares.
              </p>
            </div>
          </div>

          {/* Tabela Principal */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Data/Hora</TableHead>
                  <TableHead className="font-bold text-gray-700">Solicitado em</TableHead>
                  <TableHead className="font-bold text-gray-700">Apenado (Controle Mensal)</TableHead>
                  <TableHead className="font-bold text-gray-700">Visitante Principal</TableHead>
                  <TableHead className="font-bold text-gray-700">Tipo/Galeria</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                  <TableHead className="font-bold text-gray-700">Observações</TableHead>
                  <TableHead className="text-center font-bold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto text-[#2D5016]" /></TableCell></TableRow>
                ) : agendamentos.map(item => {
                  const dataVisString = item.vagas_configuracao?.data_visita;
                  let chave = "";
                  let mesReferencia = "";

                  if (dataVisString) {
                    const [ano, mes] = dataVisString.split('-');
                    chave = `${item.matricula_preso}_${ano}_${mes}`;
                    mesReferencia = `${mes}/${ano}`;
                  }

                  const monitor = mapaMensal[chave] || { sociais: 0, intimas: 0 };
                  const tipoNormalizado = (item.vagas_configuracao?.tipo_visita || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const ehIntima = tipoNormalizado.includes("intima");
                  const limiteAtingido = ehIntima ? monitor.intimas >= 2 : monitor.sociais >= 3;

                  const dataCriacao = parseUTC(item.created_at);
                  const dias = differenceInCalendarDays(new Date(), dataCriacao);

                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-gray-50/50 transition-colors ${item.possui_menor ? 'bg-pink-50 hover:bg-pink-100/50 border-l-4 border-l-pink-400' :
                        item.status === 'pendente' ? 'border-l-4 border-l-yellow-400' : ''
                        }`}
                    >
                      <TableCell className="align-middle py-4">
                        <div className="font-medium text-gray-900">{dataVisString ? format(parseISO(dataVisString), 'dd/MM/yyyy') : '-'}</div>
                        <div className="text-xs text-gray-500">{item.vagas_configuracao?.horario?.slice(0, 5)}</div>
                      </TableCell>

                      <TableCell className="align-middle py-4">
                        <div className={`text-xs font-bold leading-tight ${
                          item.status === 'pendente' ? (
                            dias >= 5 ? 'text-red-600' :
                            dias >= 3 ? 'text-amber-600' :
                            dias >= 1 ? 'text-amber-700' : 'text-gray-900'
                          ) : 'text-gray-500'
                        }`}>
                          {dataCriacao.toLocaleString('pt-BR')}
                        </div>
                        {item.status === 'pendente' && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border ${
                              dias >= 5 ? 'bg-red-600 text-white border-red-700 animate-pulse' :
                              dias >= 3 ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse' :
                              dias >= 1 ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                              'bg-green-100 text-green-800 border-green-200'
                            }`}>
                              {dias === 0 ? 'Solicitado Hoje' : `Há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-middle py-4">
                        <div className="font-bold text-gray-900">{item.nome_preso}</div>
                        <div className="text-xs text-gray-500 mb-2">{item.matricula_preso}</div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${monitor.sociais >= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            SOCIAL: {monitor.sociais}/3
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${monitor.intimas >= 2 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            ÍNTIMA: {monitor.intimas}/2
                          </span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1 uppercase italic flex items-center gap-2">
                          Mês Ref: {mesReferencia}
                          {item.possui_menor && (
                            <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-black text-[8px] animate-pulse">
                              COM MENOR
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-4">
                        <div className="font-bold text-gray-900 leading-tight">{item.visitante1_nome}</div>
                        <div className="flex flex-col mt-0.5 space-y-0.5">
                          <div className="text-[10px] text-gray-500 font-medium">
                            CPF: {formatarCPF(item.visitante1_cpf || item.visitante1_carteirinha) || '-'}
                          </div>
                          {(item.email || item.p_email) && (
                            <div className="text-[10px] text-gray-400 italic truncate max-w-[180px]">
                              {item.email || item.p_email}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setDetailsModal({ isOpen: true, data: item })}
                          className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all uppercase shadow-sm"
                        >
                          <Search className="w-3 h-3" /> Detalhes
                        </button>
                      </TableCell>

                      <TableCell className="align-middle py-4">
                        <div className="flex flex-col justify-center gap-0.5">
                          <div className={`inline-flex items-center w-fit gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${ehIntima ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                            {item.vagas_configuracao?.tipo_visita}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium px-0.5">
                            Galeria {item.vagas_configuracao?.galeria}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-middle py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${item.status === 'aprovado' ? 'bg-green-50 text-green-700 border-green-200' :
                          item.status === 'pendente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {item.status}
                        </span>
                      </TableCell>

                      <TableCell className="align-middle py-4 max-w-[200px]">
                        {item.motivo_recusa && (
                          <div className="text-[10px] text-red-600 italic whitespace-normal break-words leading-tight">
                            {item.motivo_recusa}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right align-middle py-4">
                        <div className="flex justify-end gap-2">
                          {item.status === 'pendente' && (
                            <>
                              <Button size="sm" className={limiteAtingido ? "bg-gray-300" : "bg-green-600 hover:bg-green-700 text-white"} disabled={actionLoading || limiteAtingido} onClick={() => executeAction(item.id, 'aprovado')}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setActionModal({ isOpen: true, agendamento: item, actionType: 'recusado' })}>
                                <XCircle className="w-4 h-4 mr-1" /> Recusar
                              </Button>
                            </>
                          )}
                          {item.status === 'aprovado' && (
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setActionModal({ isOpen: true, agendamento: item, actionType: 'cancelado' })}>
                              <XCircle className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="filas" className="space-y-4 mt-0">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="flex-1 p-3 flex items-center gap-3 bg-amber-50">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">
                Aqui encontram-se apenas os **Visitantes em Fila**.
                A fila é **promovida automaticamente**. Quando uma vaga em `Agendamentos` para a mesma data, galeria e horário for libearada (cancelada ou recusada), a primeira pessoa (Ativa) desta lista será removida daqui (Promovida) e inserida imediatamente nos Agendamentos (Pendente).
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Data/Hora Reservada</TableHead>
                  <TableHead className="font-bold text-gray-700">Entrou na Fila em</TableHead>
                  <TableHead className="font-bold text-gray-700">Apenado Alvo</TableHead>
                  <TableHead className="font-bold text-gray-700">Visitante</TableHead>
                  <TableHead className="font-bold text-gray-700">Galeria/Tipo</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto text-[#2D5016]" /></TableCell></TableRow>
                ) : filas.map(item => {
                  const dataVisString = item.vagas_configuracao?.data_visita;
                  const dataCriacaoFila = parseUTC(item.created_at);
                  const diasFila = differenceInCalendarDays(new Date(), dataCriacaoFila);
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="align-middle py-4">
                        <div className="font-medium text-gray-900">{dataVisString ? format(parseISO(dataVisString), 'dd/MM/yyyy') : '-'}</div>
                        <div className="text-xs text-gray-500">{item.vagas_configuracao?.horario?.slice(0, 5)}</div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <div className={`text-xs font-bold leading-tight ${
                          item.status === 'ativo' ? (
                            diasFila >= 5 ? 'text-red-600' :
                            diasFila >= 3 ? 'text-amber-600' :
                            diasFila >= 1 ? 'text-amber-700' : 'text-gray-900'
                          ) : 'text-gray-500'
                        }`}>
                          {dataCriacaoFila.toLocaleString('pt-BR')}
                        </div>
                        {item.status === 'ativo' && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border ${
                              diasFila >= 5 ? 'bg-red-600 text-white border-red-700 animate-pulse' :
                              diasFila >= 3 ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse' :
                              diasFila >= 1 ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                              'bg-green-100 text-green-800 border-green-200'
                            }`}>
                              {diasFila === 0 ? 'Entrou Hoje' : `Há ${diasFila} ${diasFila === 1 ? 'dia' : 'dias'}`}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <div className="font-bold text-gray-900">{item.nome_preso}</div>
                        <div className="text-xs text-gray-500 mb-2">Matrícula: {item.matricula_preso}</div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <div className="font-medium text-gray-900">{item.perfis?.nome || 'Não identificado'}</div>
                        <div className="text-xs text-gray-500">Telefone: {formatarTelefone(item.perfis?.telefone || 'N/A')}</div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <div className="capitalize text-xs font-bold text-gray-700">{item.vagas_configuracao?.tipo_visita}</div>
                        <div className="text-[10px] text-gray-400">Galeria {item.vagas_configuracao?.galeria}</div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${item.status === 'ativo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.status === 'promovido' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {item.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm mt-4">
        <div className="text-sm text-gray-500">Total: <span className="text-gray-900 font-bold">{currentTotal}</span> registros</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold text-[#2D5016] bg-green-50 px-3 py-1 rounded-md border border-green-100">Página {page + 1} de {totalPages || 1}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= currentTotal || loading}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
          <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={detailsModal.isOpen} onOpenChange={(open) => !open && setDetailsModal({ isOpen: false, data: null })}>
        <DialogContent className="bg-white max-w-2xl border-0 shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-[#2D5016]"><Calendar className="w-5 h-5" /> Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {detailsModal.data && (
            <div className="space-y-6 py-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[10px] font-bold uppercase text-green-700">Apenado</h4>
                    {(() => {
                      const tipoModal = (detailsModal.data.vagas_configuracao?.tipo_visita || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                      const ehIntimaModal = tipoModal.includes('intima');
                      return ehIntimaModal ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200 ring-2 ring-purple-300">
                          Visita Íntima
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-lg font-bold text-gray-900">{detailsModal.data.nome_preso}</p>
                  <p className="text-sm text-gray-600 font-mono">Matrícula: {detailsModal.data.matricula_preso}</p>

                  {validacaoPreso.data?.galeria && detailsModal.data.vagas_configuracao?.galeria &&
                    validacaoPreso.data.galeria.trim().toUpperCase().replace('GALERIA ', '') !== detailsModal.data.vagas_configuracao.galeria.trim().toUpperCase().replace('GALERIA ', '') && (
                      <div className="mt-3 bg-black text-white px-3 py-2 rounded-lg border-2 border-red-500 shadow-md flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-red-400">Divergência Grave!</p>
                          <p className="text-xs font-medium mt-0.5">
                            Agendado para Galeria <span className="text-yellow-400 font-bold text-[13px]">{detailsModal.data.vagas_configuracao.galeria}</span>, mas no i-PEN consta <span className="text-yellow-400 font-bold text-[13px]">{validacaoPreso.data.galeria}</span>.
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                {/* Resultado da Validação PDF */}
                <div className="shrink-0 flex flex-col items-end">
                  {validacaoPreso.loading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" /> Validando...
                    </div>
                  ) : validacaoPreso.data ? (
                    validacaoPreso.data.conferido ? (
                      <div className="bg-green-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md border-2 border-green-500">
                        <ShieldCheck size={24} className="shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-black uppercase leading-none tracking-tight">Conferido</p>
                          <p className="text-[10px] opacity-90 leading-none mt-1 font-bold">Base i-PEN {validacaoPreso.data.galeria}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-100 border-2 border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md max-w-[240px]">
                        <AlertCircle size={24} className="shrink-0 text-amber-600" />
                        <div className="text-left">
                          <p className="text-xs font-black uppercase leading-none tracking-tight">Nome Divergente</p>
                          <p className="text-[10px] leading-tight mt-1.5 font-bold uppercase">No PDF consta: <span className="text-amber-700">{validacaoPreso.data.nome}</span></p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md max-w-[240px]">
                      <XCircle size={24} className="shrink-0 text-red-600" />
                      <div className="text-left">
                        <p className="text-xs font-black uppercase leading-none tracking-tight">Não encontrado</p>
                        <p className="text-[10px] leading-tight mt-1.5 font-bold italic">Matrícula não localizada na Unidade.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Alertas do Visitante */}
              {!alertasVisitante.loading && alertasVisitante.data && (alertasVisitante.data.faltas_6m > 0 || alertasVisitante.data.internos_distintos_2m > 1) && (
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] text-gray-500 font-medium px-1 flex items-center gap-1">
                    <Info size={12} className="text-gray-400" /> Para manter a precisão destes alertas, certifique-se de sincronizar o Relatório 8.6 todo mês.
                  </div>
                  {alertasVisitante.data.faltas_6m > 0 && (
                    <div className="bg-red-50 text-red-800 px-4 py-3 rounded-xl border border-red-200 flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-red-700">Aviso de Inadimplência (No-Show)</p>
                        <p className="text-[11px] mt-0.5">
                          Este visitante possui <span className="font-bold">{alertasVisitante.data.faltas_6m} falta(s)</span> em agendamentos anteriores (últimos 6 meses). Ele pode estar ocupando vagas indevidamente.
                        </p>
                      </div>
                    </div>
                  )}
                  {alertasVisitante.data.internos_distintos_2m > 1 && (
                    <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 flex items-start gap-3 shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-amber-700">Alerta de Segurança (Cruzamento)</p>
                        <p className="text-[11px] mt-0.5">
                          Este visitante agendou visitas para <span className="font-bold">{alertasVisitante.data.internos_distintos_2m} detentos diferentes</span> nos últimos 2 meses. Risco de repasse/comércio.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2 border-b pb-1">Visitante 1 (Titular)</h4>
                  <p className="font-bold text-gray-900">{detailsModal.data.visitante1_nome}</p>
                  <p className="text-xs text-gray-600">CPF: {formatarCPF(detailsModal.data.visitante1_cpf || detailsModal.data.visitante1_carteirinha)}</p>
                  {(() => {
                    const cartTitular = detailsModal.data.perfis?.carteirinhas?.find(c => c.matricula_preso === detailsModal.data.matricula_preso && !c.menor_idade);
                    if (cartTitular?.parentesco) {
                      return (
                        <p className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                          Vínculo: {cartTitular.parentesco}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {(detailsModal.data.email || detailsModal.data.p_email) && (
                    <p className="text-xs text-gray-400 italic mt-1.5 break-all">
                      📧 {detailsModal.data.email || detailsModal.data.p_email}
                    </p>
                  )}
                  <p className="text-xs text-green-700 font-bold mt-2 tracking-tight">📞 {formatarTelefone(detailsModal.data.telefone || detailsModal.data.whatsapp || detailsModal.data.p_whatsapp)}</p>
                  {detailsModal.data.ip_address && (
                    <p className="text-[10px] text-gray-400 mt-2 font-mono flex items-center gap-1">
                      <span className="bg-gray-200 px-1 rounded text-[8px] font-black uppercase tracking-tighter">IP Registro:</span>
                      {detailsModal.data.ip_address}
                    </p>
                  )}
                </div>
                {detailsModal.data.visitante2_nome && (
                  <div className={`p-4 rounded-xl border ${detailsModal.data.possui_menor && detailsModal.data.visitante2_carteirinha?.length === 6 ? 'bg-pink-50 border-pink-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`text-[10px] font-bold uppercase mb-2 border-b pb-1 ${detailsModal.data.possui_menor && detailsModal.data.visitante2_carteirinha?.length === 6 ? 'text-pink-400 border-pink-100' : 'text-gray-400 border-gray-100'}`}>
                      Visitante 2 {detailsModal.data.possui_menor && detailsModal.data.visitante2_carteirinha?.length === 6 && "(MENOR)"}
                    </h4>
                    <p className="font-bold text-gray-900">{detailsModal.data.visitante2_nome}</p>
                    <p className="text-xs text-gray-600 uppercase">Prontuário: {detailsModal.data.visitante2_carteirinha || '-'}</p>
                    {(() => {
                      const cartV2 = detailsModal.data.perfis?.carteirinhas?.find(c => c.matricula_preso === detailsModal.data.matricula_preso && (c.nome_menor === detailsModal.data.visitante2_nome || c.nome === detailsModal.data.visitante2_nome));
                      if (cartV2?.parentesco) {
                        return (
                          <p className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                            Vínculo: {cartV2.parentesco}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                {detailsModal.data.visitante3_nome && (
                  <div className={`p-4 rounded-xl border ${detailsModal.data.possui_menor && detailsModal.data.visitante3_carteirinha?.length === 6 ? 'bg-pink-50 border-pink-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`text-[10px] font-bold uppercase mb-2 border-b pb-1 ${detailsModal.data.possui_menor && detailsModal.data.visitante3_carteirinha?.length === 6 ? 'text-pink-400 border-pink-100' : 'text-gray-400 border-gray-100'}`}>
                      Visitante 3 {detailsModal.data.possui_menor && detailsModal.data.visitante3_carteirinha?.length === 6 && "(MENOR)"}
                    </h4>
                    <p className="font-bold text-gray-900">{detailsModal.data.visitante3_nome}</p>
                    <p className="text-xs text-gray-600 uppercase">Prontuário: {detailsModal.data.visitante3_carteirinha || '-'}</p>
                    {(() => {
                      const cartV3 = detailsModal.data.perfis?.carteirinhas?.find(c => c.matricula_preso === detailsModal.data.matricula_preso && (c.nome_menor === detailsModal.data.visitante3_nome || c.nome === detailsModal.data.visitante3_nome));
                      if (cartV3?.parentesco) {
                        return (
                          <p className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                            Vínculo: {cartV3.parentesco}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento/Recusa */}
      <Dialog open={actionModal.isOpen} onOpenChange={(open) => !open && setActionModal({ isOpen: false, agendamento: null, actionType: null })}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Justificativa</DialogTitle></DialogHeader>
          <div className="py-4 text-sm text-gray-600">
            Você está prestes a {actionModal.actionType === 'recusado' ? 'recusar' : 'cancelar'} o agendamento de <strong>{actionModal.agendamento?.visitante1_nome}</strong>.

            <div className="flex flex-wrap gap-2 mt-4">
              {mensagensPadraoAgendamento.map((msg, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setMotivo(prev => prev ? prev + " " + msg : msg)}
                  className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                >
                  {msg}
                </button>
              ))}
            </div>

            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Digite o motivo aqui..." className="mt-4 bg-gray-50 border-gray-200" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionModal({ isOpen: false })}>Voltar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!motivo.trim() || actionLoading} onClick={() => executeAction(actionModal.agendamento.id, actionModal.actionType, motivo)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendamentosAdmin;