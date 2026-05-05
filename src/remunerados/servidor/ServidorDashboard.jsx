import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, FileText, CalendarDays, User, Shield, AlertTriangle, X, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import SolicitarServico from './SolicitarServico';
import HistoricoServicos from './HistoricoServicos';
import FormSolicitacaoHoras from '../components/FormSolicitacaoHoras';
import { Input } from '@/components/ui/input';
import { useRemunerados } from '../hooks/useRemunerados';
import { formatarHorasMinutos } from '@/lib/utils';

const PLANTAO_OPTIONS = [
  { value: 'A', label: 'Plantão A' },
  { value: 'B', label: 'Plantão B' },
  { value: 'C', label: 'Plantão C' },
  { value: 'D', label: 'Plantão D' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Outras Unidades', label: 'Outras Unidades' },
];

const PLANTAO_COLORS = {
  'A': 'bg-blue-500',
  'B': 'bg-emerald-500',
  'C': 'bg-amber-500',
  'D': 'bg-purple-500',
  'Administrativo': 'bg-slate-500',
  'Outras Unidades': 'bg-rose-500',
};

const CORES_AGENDA = [
  { hex: '#2D5016', name: 'Verde PML' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#eab308', name: 'Amarelo' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#8b5cf6', name: 'Roxo' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#64748b', name: 'Cinza' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#f59e0b', name: 'Âmbar' },
  { hex: '#a855f7', name: 'Roxo Claro' },
];

const getPlantaoHexColor = (plantao) => {
  switch (plantao) {
    case 'A': return '#3b82f6'; // Azul
    case 'B': return '#10b981'; // Esmeralda
    case 'C': return '#f59e0b'; // Âmbar
    case 'D': return '#a855f7'; // Roxo
    case 'Administrativo': return '#64748b'; // Cinza
    case 'Outras Unidades': return '#ef4444'; // Vermelho
    default: return '#2D5016';
  }
};

const AgendaModal = ({ 
  isOpen, onClose, selectedDate, servidorId, servidorPlantao, eventosDia, plantaoDia, createAgendaEvento, deleteAgendaEvento, isSaving, marcarEscalaPlantao
}) => {
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState('');
  
  const plantaoColor = getPlantaoHexColor(servidorPlantao);
  const allowedColors = CORES_AGENDA.filter(c => c.hex !== plantaoColor);
  
  const [cor, setCor] = useState(allowedColors[0]?.hex || CORES_AGENDA[0].hex);

  const canGenerateEscala = servidorPlantao && !['Administrativo', 'Outras Unidades'].includes(servidorPlantao);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    await createAgendaEvento({
      servidor_id: servidorId,
      data: format(selectedDate, 'yyyy-MM-dd'),
      titulo,
      hora_inicio: hora || null,
      cor
    });

    setTitulo('');
    setHora('');
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#2D5016]/10 p-2 rounded-lg">
                <CalendarDays className="w-6 h-6 text-[#2D5016]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Agenda Pessoal</h2>
                <p className="text-sm text-zinc-500 capitalize">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 uppercase tracking-wider">Compromissos do Dia</h3>
            <div className="space-y-3">
              {plantaoDia && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Plantão Remunerado ({plantaoDia.tipo})</p>
                      <p className="text-xs text-blue-700">Aprovado pelo Admin</p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
              )}

              {eventosDia.map(evento => (
                <div key={evento.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 bg-zinc-50 group hover:border-zinc-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: evento.cor }} />
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{evento.titulo}</p>
                      {evento.hora_inicio && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {evento.hora_inicio.substring(0, 5)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteAgendaEvento(evento.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {!plantaoDia && eventosDia.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  Nenhum compromisso para este dia.
                </p>
              )}
            </div>
          </div>

          {canGenerateEscala && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h3 className="text-sm font-bold text-blue-900 mb-1">Geração de Escala Automática</h3>
              <p className="text-xs text-blue-700 mb-3">
                Você pode preencher automaticamente a sua agenda para os próximos 6 meses com os dias do seu plantão (trabalho 24h, folga 72h), começando por hoje.
              </p>
              <Button 
                onClick={async () => {
                  if (window.confirm("Isso irá gerar a escala de plantão para os próximos 6 meses e substituirá a escala gerada anteriormente. Deseja continuar?")) {
                    await marcarEscalaPlantao(servidorId, selectedDate, plantaoColor);
                  }
                }}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 h-8"
              >
                Definir como Início da Escala (24x72)
              </Button>
            </div>
          )}

          <div className="w-full h-px bg-zinc-100 mb-6" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Novo Compromisso</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Título (ex: Folga F8, Troca)</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que você tem neste dia?" className="bg-zinc-50 border-zinc-200" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Horário (Opcional)</label>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="bg-zinc-50 border-zinc-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Cor</label>
                <div className="flex flex-wrap gap-2 pt-2">
                  {allowedColors.map(c => (
                    <button key={c.hex} type="button" onClick={() => setCor(c.hex)} title={c.name} className={`w-6 h-6 rounded-full transition-transform ${cor === c.hex ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
                {canGenerateEscala && (
                  <p className="text-[10px] text-zinc-400 mt-2 font-medium leading-tight">
                    * A cor atrelada ao seu plantão foi ocultada para garantir a exclusividade visual da sua escala no calendário.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full mt-4 bg-[#2D5016] hover:bg-[#203a10] text-white font-semibold flex items-center justify-center gap-2" disabled={isSaving || !titulo.trim()}>
              {isSaving ? 'Salvando...' : (<><Plus className="w-4 h-4" /> Adicionar à Agenda</>)}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ServidorDashboard = () => {
  const [servidor, setServidor] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [savingPlantao, setSavingPlantao] = useState(false);
  const { toast } = useToast();
  const { 
    bancoHoras, 
    fetchBancoHoras, 
    servicos, 
    fetchServicos, 
    solicitacoesBancoHoras, 
    fetchSolicitacoes, 
    solicitacoesUsoHoras,
    fetchUsoHoras,
    cancelarSolicitacaoHorasServidor,
    cancelarUsoHorasServidor,
    agendaEventos,
    fetchAgendaEventos,
    createAgendaEvento,
    deleteAgendaEvento,
    limparEscalaPlantao,
    marcarEscalaPlantao,
    loading 
  } = useRemunerados();
  const navigate = useNavigate();

  // Estados para filtros e paginação de horas
  const [mesFiltro, setMesFiltro] = useState((new Date().getMonth() + 1).toString());
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString());
  const [paginaHoras, setPaginaHoras] = useState(1);
  const itensPorPaginaHoras = 10;

  const combinedSolicitacoes = useMemo(() => {
    const arr1 = (solicitacoesBancoHoras || []).map(sol => ({
      ...sol,
      isUso: false,
      data_exibicao: sol.created_at,
      label_acao: "Crédito (Adicionar)",
      detalhe: `Tipo: ${sol.tipo} - Motivo: ${sol.motivo}`
    }));
    const arr2 = (solicitacoesUsoHoras || []).map(sol => ({
      ...sol,
      isUso: true,
      data_exibicao: sol.created_at,
      label_acao: "Débito (Usar)",
      detalhe: `Data Uso: ${sol.data_uso} - Obs: ${sol.observacao || 'N/A'}`
    }));
    return [...arr1, ...arr2].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [solicitacoesBancoHoras, solicitacoesUsoHoras]);

  const filteredSolicitacoes = useMemo(() => {
    return combinedSolicitacoes.filter(sol => {
      const date = new Date(sol.data_exibicao);
      const m = (date.getMonth() + 1).toString();
      const y = date.getFullYear().toString();
      
      const matchMes = mesFiltro === 'todos' || m === mesFiltro;
      const matchAno = anoFiltro === 'todos' || y === anoFiltro;
      
      return matchMes && matchAno;
    });
  }, [combinedSolicitacoes, mesFiltro, anoFiltro]);

  useEffect(() => {
    setPaginaHoras(1);
  }, [mesFiltro, anoFiltro]);

  const totalPaginasHoras = Math.ceil(filteredSolicitacoes.length / itensPorPaginaHoras);
  const itensExibidosHoras = filteredSolicitacoes.slice(
    (paginaHoras - 1) * itensPorPaginaHoras,
    paginaHoras * itensPorPaginaHoras
  );

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session) {
          navigate('/remunerados/login');
          return;
        }

        setUserEmail(sessionData.session.user.email || '');

        const { data: servData, error: servError } = await supabase
          .from('servidores')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .maybeSingle();

        if (servError || !servData) {
          navigate('/remunerados/login');
          return;
        }

        setServidor(servData);

        fetchBancoHoras(servData.id);
        fetchServicos(servData.id);
        fetchSolicitacoes(servData.id);
        fetchUsoHoras(servData.id);
        fetchAgendaEventos(servData.id);
      } catch (err) {
        console.error("Dashboard initialization error:", err);
        navigate('/remunerados/login');
      } finally {
        setLoadingInit(false);
      }
    };

    init();
  }, [navigate, fetchBancoHoras, fetchServicos, fetchSolicitacoes, fetchUsoHoras, fetchAgendaEventos]);

  const handlePlantaoChange = async (novoPlantao) => {
    if (!servidor) return;

    if (servidor.plantao && servidor.plantao !== novoPlantao) {
      const confirmMsg = "Atenção: Ao alterar o plantão (ex: de Plantão A para Plantão B), a escala automática gerada anteriormente será excluída do sistema. Deseja continuar?";
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setSavingPlantao(true);
    try {
      const { error } = await supabase
        .from('servidores')
        .update({ plantao: novoPlantao })
        .eq('id', servidor.id);

      if (error) throw error;

      if (servidor.plantao && servidor.plantao !== novoPlantao && limparEscalaPlantao) {
        await limparEscalaPlantao(servidor.id);
      }

      setServidor(prev => ({ ...prev, plantao: novoPlantao }));
      toast({
        title: "Plantão atualizado",
        description: `Seu plantão foi alterado para ${novoPlantao}.`,
        className: "bg-[#2D5016] text-white"
      });
    } catch (err) {
      console.error("Erro ao atualizar plantão:", err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plantão.",
        variant: "destructive"
      });
    } finally {
      setSavingPlantao(false);
    }
  };

  const handleSolicitado = () => {
    if(servidor) {
      fetchServicos(servidor.id);
    }
  };

  const handleHorasSolicitadas = () => {
    if(servidor) {
      fetchSolicitacoes(servidor.id);
      fetchUsoHoras(servidor.id);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const getMetricasMes = () => {
    let rdMes = 0;
    let rnMes = 0;
    let pendentes = 0;

    if (servicos && Array.isArray(servicos)) {
      servicos.forEach(s => {
        const date = new Date(s.data + 'T12:00:00Z');
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          if (s.status === 'aprovado') {
            if (s.tipo === 'RD') rdMes++;
            if (s.tipo === 'RN') rnMes++;
          }
        }
        if (s.status === 'pendente') pendentes++;
      });
    }

    return { rdMes, rnMes, pendentes };
  };

  const metricas = getMetricasMes();

  // 1. Próximo Serviço
  const proximoServico = useMemo(() => {
    if (!servicos) return null;
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const futuros = servicos.filter(s => s.status === 'aprovado' && new Date(s.data + 'T12:00:00Z') >= hoje);
    futuros.sort((a, b) => new Date(a.data) - new Date(b.data));
    return futuros.length > 0 ? futuros[0] : null;
  }, [servicos]);

  // 2. Dias do Mini Calendário
  const diasPlantao = useMemo(() => {
    if (!servicos) return [];
    return servicos.filter(s => s.status === 'aprovado').map(s => {
      const d = new Date(s.data + 'T12:00:00Z');
      return d;
    });
  }, [servicos]);

  // 3. Gráfico de Evolução de Horas do Mês
  const chartDataEvolucao = useMemo(() => {
    let creditosMes = 0;
    let debitosMes = 0;
    if (solicitacoesBancoHoras) {
      solicitacoesBancoHoras.forEach(s => {
        if (s.status === 'aprovado' && new Date(s.created_at).getMonth() === currentMonth) {
          creditosMes += Number(s.horas);
        }
      });
    }
    if (solicitacoesUsoHoras) {
      solicitacoesUsoHoras.forEach(s => {
        if (s.status === 'aprovado' && new Date(s.created_at).getMonth() === currentMonth) {
          debitosMes += Number(s.horas);
        }
      });
    }
    return [
      { name: 'Créditos', horas: creditosMes, fill: '#10b981' },
      { name: 'Débitos', horas: debitosMes, fill: '#ef4444' }
    ];
  }, [solicitacoesBancoHoras, solicitacoesUsoHoras, currentMonth]);

  // 4. Últimas Atualizações
  const recentUpdates = useMemo(() => {
    const srvs = (servicos || []).map(s => ({
      id: s.id,
      tipoObj: 'plantao',
      data: s.alterado_em || s.created_at || s.data,
      titulo: `Plantão ${s.tipo} (${format(new Date(s.data + 'T12:00:00Z'), 'dd/MM')})`,
      status: s.status
    }));
    
    const h = combinedSolicitacoes.map(s => ({
      id: s.id,
      tipoObj: s.isUso ? 'debito' : 'credito',
      data: s.aprovado_em || s.created_at,
      titulo: s.isUso ? `Uso de ${formatarHorasMinutos(s.horas)}` : `Crédito de ${formatarHorasMinutos(s.horas)}`,
      status: s.status
    }));

    const all = [...srvs, ...h].filter(s => s.status === 'aprovado' || s.status === 'recusado').sort((a,b) => new Date(b.data) - new Date(a.data));
    return all.slice(0, 4);
  }, [servicos, combinedSolicitacoes]);

  const [activeTab, setActiveTab] = useState("geral");

  // === LÓGICA DA AGENDA INTERATIVA ===
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date());
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);

  const handleDayClick = (day) => {
    setSelectedAgendaDate(day);
    setIsAgendaOpen(true);
  };

  // Preparando os modificadores do DayPicker
  const agendaModifiers = useMemo(() => {
    const mods = { aprovados: diasPlantao };
    (agendaEventos || []).forEach(e => {
      // Criar uma chave única para cada cor para podermos injetar o estilo
      const key = `custom_${e.cor.replace('#', '')}`;
      if (!mods[key]) mods[key] = [];
      const dataLocal = new Date(e.data + 'T12:00:00Z');
      mods[key].push(dataLocal);
    });
    return mods;
  }, [diasPlantao, agendaEventos]);

  const agendaModifierStyles = useMemo(() => {
    const styles = {
      aprovados: {
        fontWeight: 'bold',
        backgroundColor: '#3b82f6', // Plantões remunerados em Azul
        color: 'white',
        borderRadius: '100%'
      }
    };
    (agendaEventos || []).forEach(e => {
      const key = `custom_${e.cor.replace('#', '')}`;
      if (!styles[key]) {
        styles[key] = {
          fontWeight: 'bold',
          backgroundColor: e.cor,
          color: 'white',
          borderRadius: '100%'
        };
      }
    });
    return styles;
  }, [agendaEventos]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-green-500">Aprovado</Badge>;
      case 'recusado': return <Badge variant="destructive">Recusado</Badge>;
      default: return <Badge className="bg-yellow-500">Pendente</Badge>;
    }
  };

  // Derivando eventos do dia selecionado
  const eventosDia = useMemo(() => {
    if (!agendaEventos || !selectedAgendaDate) return [];
    const dateStr = format(selectedAgendaDate, 'yyyy-MM-dd');
    return agendaEventos.filter(e => e.data === dateStr);
  }, [agendaEventos, selectedAgendaDate]);

  const plantaoDia = useMemo(() => {
    if (!servicos || !selectedAgendaDate) return [];
    const dateStr = format(selectedAgendaDate, 'yyyy-MM-dd');
    return servicos.find(s => s.status === 'aprovado' && s.data === dateStr);
  }, [servicos, selectedAgendaDate]);

  if (loadingInit) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Carregando painel...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Dashboard Servidor - Remunerados</title>
      </Helmet>

      {/* === HEADER === */}
      <header className="bg-zinc-950 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#2D5016]" />
            <h1 className="font-bold text-xl">Sistema de Remunerados</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {/* SELETOR DE PLANTÃO GLOBAL */}
            {servidor?.plantao && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-xs hidden sm:inline">Plantão:</span>
                <Select value={servidor.plantao} onValueChange={handlePlantaoChange}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] bg-zinc-800 border-zinc-700 text-white text-xs focus:ring-[#2D5016] focus:ring-offset-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${PLANTAO_COLORS[servidor.plantao]}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {PLANTAO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${PLANTAO_COLORS[opt.value]}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <span className="hidden md:inline">
              Olá,{" "}
              <span 
                className="font-bold text-[#2D5016]"
                style={{ 
                  textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' 
                }}
              >
                {servidor?.nome}
              </span>
            </span>
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/remunerados/login'); }} className="hover:text-red-400 transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Clock className="w-6 h-6"/></div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Banco de Horas</p>
                  <p className="text-2xl font-bold">{formatarHorasMinutos(bancoHoras?.saldo)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#2D5016] shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-[#2D5016] rounded-full"><CheckCircle className="w-6 h-6"/></div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">RD (Este Mês)</p>
                  <p className="text-2xl font-bold">{metricas.rdMes}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><CheckCircle className="w-6 h-6"/></div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">RN (Este Mês)</p>
                  <p className="text-2xl font-bold">{metricas.rnMes}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full"><FileText className="w-6 h-6"/></div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Pendentes</p>
                  <p className="text-2xl font-bold">{metricas.pendentes}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 gap-2 md:gap-0 h-auto p-1 mb-6">
              <TabsTrigger value="geral" className="h-10 md:h-8 text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="solicitar" className="h-10 md:h-8 text-xs sm:text-sm">Solicitar Serviço</TabsTrigger>
              <TabsTrigger value="historico" className="h-10 md:h-8 text-xs sm:text-sm">Meu Histórico</TabsTrigger>
              <TabsTrigger value="horas" className="h-10 md:h-8 text-xs sm:text-sm">Banco de Horas</TabsTrigger>
              <TabsTrigger value="perfil" className="flex items-center gap-1.5 h-10 md:h-8 text-xs sm:text-sm">
                <User className="w-3.5 h-3.5 hidden sm:block" />
                Meu Perfil
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="geral">
              {/* Próximo Serviço Banner */}
              {proximoServico && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                  <div className="bg-[#2D5016] text-white p-4 rounded-xl shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-full">
                        <CalendarDays className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Próximo Serviço</h3>
                        <p className="text-white/80 text-sm">
                          Seu próximo plantão aprovado é dia {format(new Date(proximoServico.data + 'T12:00:00Z'), 'dd/MM/yyyy')} ({proximoServico.tipo})
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Ações Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Button 
                  onClick={() => setActiveTab("solicitar")}
                  className="h-16 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 shadow-sm flex items-center justify-start gap-4 px-6 transition-all hover:scale-[1.01]"
                >
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Solicitar Novo Plantão</div>
                    <div className="text-xs text-zinc-500 font-normal">Agendar plantões RD/RN</div>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => setActiveTab("horas")}
                  className="h-16 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 shadow-sm flex items-center justify-start gap-4 px-6 transition-all hover:scale-[1.01]"
                >
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Gerenciar Banco de Horas</div>
                    <div className="text-xs text-zinc-500 font-normal">Pedir crédito ou uso de horas</div>
                  </div>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mini Calendário */}
                <Card className="lg:col-span-1 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-[#2D5016]" />
                      Seus Plantões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <DayPicker
                      mode="multiple"
                      locale={ptBR}
                      selected={[]} // Retirando a seleção padrão para focar nos modificadores
                      modifiers={agendaModifiers}
                      modifiersStyles={agendaModifierStyles}
                      onDayClick={handleDayClick}
                      className="cursor-pointer"
                    />
                    <p className="text-[10px] text-zinc-400 mt-2 font-medium bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                      💡 Clique em um dia para criar um evento
                    </p>
                  </CardContent>
                </Card>

                {/* Gráfico Evolução de Horas */}
                <Card className="lg:col-span-1 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Horas no Mês Atual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataEvolucao}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="horas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Últimas Atualizações Timeline */}
                <Card className="lg:col-span-1 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Últimas Atualizações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentUpdates.length > 0 ? (
                      <div className="space-y-4 pt-4">
                        {recentUpdates.map((update, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full mt-1.5 ${update.status === 'aprovado' ? 'bg-green-500' : 'bg-red-500'}`} />
                              {idx !== recentUpdates.length - 1 && <div className="w-px h-full bg-zinc-200 my-1" />}
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-medium text-zinc-900">{update.titulo}</p>
                              <p className="text-xs text-zinc-500">
                                {update.status === 'aprovado' ? 'Aprovado' : 'Recusado'} em {format(new Date(update.data), 'dd/MM HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        Nenhuma atualização recente.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="solicitar">
               <div className="max-w-2xl mx-auto">
                 <SolicitarServico servidorId={servidor?.id} servidorPlantao={servidor?.plantao} onSolicitado={handleSolicitado} />
               </div>
            </TabsContent>
            
            <TabsContent value="historico">
               <HistoricoServicos servidorId={servidor?.id} />
            </TabsContent>

            <TabsContent value="horas">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1">
                   <FormSolicitacaoHoras servidorId={servidor?.id} onSolicitacaoCriada={handleHorasSolicitadas} />
                 </div>
                 <div className="lg:col-span-2">
                   <Card className="border-0 shadow-sm h-full">
                      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="text-lg">Minhas Solicitações de Horas</CardTitle>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Select value={mesFiltro} onValueChange={setMesFiltro}>
                            <SelectTrigger className="h-8 w-[120px] bg-white">
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
                            <SelectTrigger className="h-8 w-[100px] bg-white">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos os Anos</SelectItem>
                              {[2024, 2025, 2026].map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loading && filteredSolicitacoes.length === 0 ? (
                          <div className="py-8 text-center text-gray-500">Carregando...</div>
                        ) : filteredSolicitacoes.length === 0 ? (
                          <div className="py-8 text-center text-gray-500">Nenhuma solicitação encontrada para o período.</div>
                        ) : (
                         <div className="overflow-x-auto">
                           <Table>
                             <TableHeader>
                               <TableRow>
                                 <TableHead>Data Criação</TableHead>
                                 <TableHead>Ação</TableHead>
                                 <TableHead>Horas</TableHead>
                                 <TableHead>Detalhes</TableHead>
                                 <TableHead>Status</TableHead>
                                 <TableHead className="text-right">Ações</TableHead>
                               </TableRow>
                             </TableHeader>
                              <TableBody>
                                {itensExibidosHoras.map(sol => (
                                 <TableRow key={`${sol.isUso ? 'uso' : 'add'}-${sol.id}`}>
                                   <TableCell className="whitespace-nowrap">
                                     {format(new Date(sol.data_exibicao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                   </TableCell>
                                   <TableCell>
                                     <Badge variant="outline" className={sol.isUso ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50"}>
                                       {sol.label_acao}
                                     </Badge>
                                   </TableCell>
                                   <TableCell className="font-bold">{sol.isUso ? '-' : '+'}{formatarHorasMinutos(sol.horas)}</TableCell>
                                   <TableCell className="max-w-[200px] truncate block" title={sol.detalhe}>{sol.detalhe}</TableCell>
                                   <TableCell>{getStatusBadge(sol.status)}</TableCell>
                                   <TableCell className="text-right">
                                     {sol.status === 'pendente' && (
                                       <Button 
                                         variant="ghost" 
                                         size="sm" 
                                         onClick={async () => {
                                           if(window.confirm('Deseja realmente cancelar esta solicitação?')) {
                                             if(sol.isUso) {
                                               await cancelarUsoHorasServidor(sol.id);
                                             } else {
                                               await cancelarSolicitacaoHorasServidor(sol.id);
                                             }
                                             handleHorasSolicitadas();
                                           }
                                         }} 
                                         className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                       >
                                         Cancelar
                                       </Button>
                                     )}
                                   </TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Paginação Horas */}
                        {totalPaginasHoras > 1 && (
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                            <span className="text-xs text-gray-500 font-medium">
                              Página {paginaHoras} de {totalPaginasHoras} ({filteredSolicitacoes.length} registros)
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={paginaHoras === 1}
                                onClick={() => setPaginaHoras(p => p - 1)}
                                className="h-8 px-3 text-xs"
                              >
                                Anterior
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={paginaHoras === totalPaginasHoras}
                                onClick={() => setPaginaHoras(p => p + 1)}
                                className="h-8 px-3 text-xs"
                              >
                                Próxima
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                   </Card>
                 </div>
               </div>
            </TabsContent>

            {/* === ABA MEU PERFIL === */}
            <TabsContent value="perfil">
              <div className="max-w-2xl mx-auto">
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#2D5016]/30 border-2 border-[#84cc41]/30 flex items-center justify-center">
                        <User className="w-8 h-8 text-[#84cc41]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{servidor?.nome}</h2>
                        <p className="text-zinc-400 text-sm">Servidor do Sistema de Remunerados</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nome */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Nome Completo</p>
                        <p className="text-gray-900 font-medium">{servidor?.nome || '—'}</p>
                      </div>

                      {/* Matrícula */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Matrícula</p>
                        <p className="text-gray-900 font-mono font-bold text-lg">{servidor?.matricula || '—'}</p>
                      </div>

                      {/* Email */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">E-mail</p>
                        <p className="text-gray-900 font-medium text-sm break-all">{userEmail || '—'}</p>
                      </div>

                      {/* Plantão */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Plantão</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${PLANTAO_COLORS[servidor?.plantao] || 'bg-gray-300'}`} />
                          <p className="text-gray-900 font-semibold">
                            {servidor?.plantao ? (PLANTAO_OPTIONS.find(p => p.value === servidor.plantao)?.label || servidor.plantao) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Status</p>
                        <Badge className={servidor?.ativo ? "bg-green-500" : "bg-red-500"}>
                          {servidor?.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      {/* Banco de Horas */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Banco de Horas</p>
                        <p className="text-gray-900 font-bold text-lg">{formatarHorasMinutos(bancoHoras?.saldo)}</p>
                      </div>
                    </div>

                    {/* Alterar plantão */}
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">Alterar Plantão</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PLANTAO_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handlePlantaoChange(opt.value)}
                            disabled={savingPlantao || servidor?.plantao === opt.value}
                            className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all hover:shadow-sm active:scale-[0.97] disabled:opacity-40
                              ${servidor?.plantao === opt.value 
                                ? 'border-[#2D5016] bg-[#2D5016]/10 text-[#2D5016]' 
                                : 'border-gray-200 hover:border-[#2D5016] text-gray-600'
                              }
                            `}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full ${PLANTAO_COLORS[opt.value]} mx-auto mb-1`} />
                            {opt.value === 'Outras Unidades' ? 'Outras' : opt.value === 'Administrativo' ? 'Admin.' : opt.value}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-4">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Cadastrado em {servidor?.created_at ? format(new Date(servidor.created_at), "dd/MM/yyyy", { locale: ptBR }) : '—'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

        </motion.div>
      </main>

      <AgendaModal 
        isOpen={isAgendaOpen}
        onClose={() => setIsAgendaOpen(false)}
        selectedDate={selectedAgendaDate}
        servidorId={servidor?.id}
        servidorPlantao={servidor?.plantao}
        eventosDia={eventosDia}
        plantaoDia={plantaoDia}
        createAgendaEvento={createAgendaEvento}
        deleteAgendaEvento={deleteAgendaEvento}
        isSaving={loading}
        marcarEscalaPlantao={marcarEscalaPlantao}
      />
    </div>
  );
};

export default ServidorDashboard;