import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, Calendar, Clock, MapPin, AlertCircle, PlusCircle,
  List, User, ArrowLeft, CheckCircle2, History, XCircle,
  ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AgendamentoModal from '@/components/agendamentos/AgendamentoModal';
import * as agendamentosService from '@/services/agendamentosService';

const AgendamentosPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [agendamentos, setAgendamentos] = useState([]);
  const [minhasFilas, setMinhasFilas] = useState([]);
  const [carteirinhaAtiva, setCarteirinhaAtiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("meus-agendamentos");

  // PAGINAÇÃO
  const [page, setPage] = useState(0);
  const pageSize = 5;

  // MODAL DE INFORMAÇÃO PARA MENORES
  const [showMenoresModal, setShowMenoresModal] = useState(false);

  // Estilo para o efeito Shake nos pendentes
  const shakeAnimation = `
    @keyframes subtle-shake {
      0% { transform: translateX(0); }
      25% { transform: translateX(1px); }
      50% { transform: translateX(-1px); }
      75% { transform: translateX(1px); }
      100% { transform: translateX(0); }
    }
    .animate-shake {
      animation: subtle-shake 0.3s ease-in-out infinite;
      animation-play-state: paused;
    }
    .animate-shake:hover {
      animation-play-state: running;
    }
  `;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await agendamentosService.getAgendamentosByUser(user.id);
      setAgendamentos(data || []);
      const fila = await agendamentosService.getMinhasFilas(user.id);
      setMinhasFilas(fila || []);
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Falha ao carregar agendamentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    let isMounted = true;
    const initPage = async () => {
      if (!user?.id) return;
      try {
        let isAtiva = true;
        if (typeof agendamentosService.verificarCarteirinhaStatus === 'function') {
          const status = await agendamentosService.verificarCarteirinhaStatus(user.id);
          isAtiva = status?.ativa === true;
        }
        if (isMounted) {
          setCarteirinhaAtiva(isAtiva);
          if (isAtiva) await fetchData();
        }
      } catch (error) {
        if (isMounted) setCarteirinhaAtiva(false);
      }
    };
    initPage();
    return () => { isMounted = false; };
  }, [user, fetchData]);

  const formatMonth = (date) => {
    const m = date.toLocaleDateString('pt-BR', { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  };

  const categorias = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const mesAtualStr = hoje.toISOString().slice(0, 7); // "YYYY-MM"
    const dataProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const proximoMesStr = dataProximoMes.toISOString().slice(0, 7); // "YYYY-MM"

    // Ordenação base para garantir que os mais recentes apareçam primeiro
    const sorted = [...agendamentos].sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita));

    // FILTRAGEM COM A NOVA LÓGICA
    const ativos = sorted.filter(a => {
      const dataVisita = new Date(a.data_visita + 'T00:00:00');

      // 1. PENDENTES sempre ficam em ativos (mesmo se a data passou)
      if (a.status === 'pendente') return true;

      // 2. APROVADOS ficam em ativos apenas se forem hoje ou no futuro
      if (a.status === 'aprovado' && dataVisita >= hoje) return true;

      return false;
    });

    const historicoCompleto = sorted.filter(a => {
      const dataVisita = new Date(a.data_visita + 'T00:00:00');

      // Vai para o histórico se:
      // - O status for de finalização (cancelado, recusado, realizado, revogado)
      // - OU se for um APROVADO que já passou da data
      const isStatusFinalizado = ['cancelado', 'revogado', 'recusado', 'realizado'].includes(a.status);
      const isAprovadoAntigo = a.status === 'aprovado' && dataVisita < hoje;

      return isStatusFinalizado || isAprovadoAntigo;
    });

    const pendentesMesAtual = sorted.filter(a => a.status === 'pendente' && a.data_visita?.startsWith(mesAtualStr)).length;
    const pendentesProximoMes = sorted.filter(a => a.status === 'pendente' && a.data_visita?.startsWith(proximoMesStr)).length;

    // Aplicando paginação apenas no histórico
    const totalPages = Math.ceil(historicoCompleto.length / pageSize);
    const historicoPaginado = historicoCompleto.slice(page * pageSize, (page + 1) * pageSize);

    return {
      ativos, // Estes aparecerão em "Próximas Visitas"
      historico: historicoPaginado,
      totalHistorico: historicoCompleto.length,
      totalPages,
      pendentesMesAtual,
      pendentesProximoMes,
      nomeMesAtual: formatMonth(hoje),
      nomeProximoMes: formatMonth(dataProximoMes),
    };
  }, [agendamentos, page]);

  const getStatusBadge = (status) => {
    const config = {
      aprovado: "bg-green-100 text-green-700 border-green-200",
      pendente: "bg-amber-100 text-amber-700 border-amber-200",
      cancelado: "bg-gray-100 text-gray-700 border-gray-200",
      recusado: "bg-red-100 text-red-700 border-red-200",
      revogado: "bg-red-100 text-red-700 border-red-200",
      realizado: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return (
      <Badge variant="outline" className={`font-black uppercase text-xs ${config[status] || ""}`}>
        {status}
      </Badge>
    );
  };

  const RenderAgendamentoCard = (agendamento) => {
    let borderColor = "border-gray-400";
    let bgColor = "bg-gray-50";
    let shakeClass = "";

    if (agendamento.status === 'aprovado') {
      borderColor = "border-green-600";
      bgColor = "bg-green-50";
    } else if (agendamento.status === 'pendente') {
      borderColor = "border-amber-500";
      bgColor = "bg-amber-50";
      shakeClass = "animate-shake";
    }

    return (
      <Card key={agendamento.id} className={`overflow-hidden border-none shadow-sm hover:shadow-md transition-all group ${shakeClass}`}>
        <CardContent className="p-0 flex flex-col md:flex-row">
          <div className={`p-6 flex flex-col items-center justify-center min-w-[120px] text-center transition-colors border-l-4 ${borderColor} ${bgColor}`}>
            <span className="text-3xl font-black text-gray-900 leading-none">
              {new Date(agendamento.data_visita + 'T00:00:00').getDate()}
            </span>
            <span className="text-xs font-bold uppercase text-gray-500 mt-1">
              {new Date(agendamento.data_visita + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
            </span>
            <span className="text-xs text-gray-400 mt-1 font-mono">
              {agendamento.horario ? agendamento.horario.slice(0, 5) : '--:--'}H
            </span>
          </div>

          <div className="flex-1 p-5 bg-white flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-full">
                  <User className="w-4 h-4 text-[#2D5016]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{agendamento.nome_preso}</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter">
                    Matrícula: {agendamento.matricula_preso}
                  </p>
                </div>
              </div>
              {getStatusBadge(agendamento.status)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Galeria {agendamento.galeria}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 capitalize">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                <span>{agendamento.tipo_visita?.replace('_', ' ')}</span>
              </div>
            </div>

            {(agendamento.visitante2_nome || agendamento.visitante3_nome) && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Acompanhantes</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {agendamento.visitante2_nome && (
                    <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5 capitalize" translate="no">
                      <div className="w-1 h-1 rounded-full bg-blue-400" /> {agendamento.visitante2_nome.toLowerCase()}
                    </p>
                  )}
                  {agendamento.visitante3_nome && (
                    <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5 capitalize" translate="no">
                      <div className="w-1 h-1 rounded-full bg-blue-400" /> {agendamento.visitante3_nome.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(agendamento.status === 'cancelado' || agendamento.status === 'recusado' || agendamento.status === 'revogado') && agendamento.motivo_recusa && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-100 flex gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-800"><strong>Motivo:</strong> {agendamento.motivo_recusa}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleCancelarFila = async (filaId) => {
    try {
      setLoading(true);
      await agendamentosService.cancelarFila(filaId, user.id);
      toast({
        title: "Cancelamento confirmado",
        description: "Você saiu da fila de espera.",
        className: "bg-[#2D5016] text-white"
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar sua posição na fila.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (carteirinhaAtiva === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-[#2D5016]" /></div>;

  if (carteirinhaAtiva === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Helmet><title>Acesso Restrito - Presídio de Lages</title></Helmet>
        <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden">
          <div className="h-2 bg-amber-500" /> {/* Barra de destaque superior */}
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-500 animate-pulse" />
            </div>

            <div className="space-y-3"> {/* Aumentei levemente o space-y para acomodar a badge */}
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                Carteirinha Necessária
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Você ainda não possui uma carteirinha ativa ou seus documentos estão em análise.
              </p>

              {/* NOVA BADGE DE PRAZO */}
              <div className="flex justify-center pt-1">
                <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-red-700">
                  Prazo para confecção de carteirinhas novas ou renovação é de 20 dias
                </span>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">
                O que devo fazer?
              </p>
              <p className="text-sm text-gray-700">
                Para regularizar a carteirinha oficial junto ao sistema, acesse a aba <strong className="text-[#2D5016]">"Carteirinha"</strong> na página principal do seu Painel e envie os documentos obrigatórios.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/painel')}
                className="bg-[#2D5016] hover:bg-[#1e360f] text-white font-bold uppercase text-xs tracking-widest py-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Ir para o Painel Principal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{shakeAnimation}</style>
      <Helmet><title>Agendamentos - Presídio de Lages</title></Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">

          <Link to="/painel">
            <Button variant="ghost" className="text-gray-500 hover:text-[#2D5016] p-0 font-bold uppercase text-xs tracking-widest">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Início
            </Button>
          </Link>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Agendamentos</h1>
              <p className="text-gray-500 text-sm">Organize suas visitas e acompanhe as aprovações.</p>
            </div>

            {/* Bloco de Regras Atualizado */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="bg-amber-500 p-2 rounded-full shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="space-y-3 w-full">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 leading-tight uppercase">Regras e Critérios</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Visitante, você pode solicitar até <strong>5 agendamentos por mês</strong>.
                    Uma vez que um agendamento for <strong>Aprovado, Cancelado ou Recusado</strong>,
                    você poderá realizar uma nova solicitação para o mesmo mês se não tiver atingido o limite.
                  </p>
                </div>

                {/* Nova Regra de Comportamento/Tempo */}
                <div className="pt-3 border-t border-amber-200">
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    ⚠️ <strong>Importante:</strong> Se o comportamento do detento não estiver como <strong className="text-amber-900">"BOM no i-Pen"</strong> ou se ele ingressou na unidade há menos de <strong>60 dias</strong> da data da visita, o agendamento será <strong>cancelado automaticamente</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl border ${categorias.pendentesMesAtual >= 5 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-green-200 text-green-700 shadow-sm'}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">{categorias.nomeMesAtual}</span>
                </div>
                <Badge className={`${categorias.pendentesMesAtual >= 5 ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white border-none px-2 py-0.5 shadow-sm`}>
                  {Math.max(0, 5 - categorias.pendentesMesAtual)} restantes
                </Badge>
              </div>

              <div className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-xl border ${categorias.pendentesProximoMes >= 5 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-blue-200 text-blue-700 shadow-sm'}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">{categorias.nomeProximoMes}</span>
                </div>
                <Badge className={`${categorias.pendentesProximoMes >= 5 ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none px-2 py-0.5 shadow-sm`}>
                  {Math.max(0, 5 - categorias.pendentesProximoMes)} restantes
                </Badge>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-200/50 p-1 rounded-xl">
              <TabsTrigger value="meus-agendamentos" className="rounded-lg font-bold data-[state=active]:bg-[#2D5016] data-[state=active]:text-white">
                <List className="w-4 h-4 mr-2 hidden sm:block" /> Agendamentos
              </TabsTrigger>
              <TabsTrigger value="fila-espera" className="rounded-lg font-bold data-[state=active]:bg-[#2D5016] data-[state=active]:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 hidden sm:block" />
                Espera
                {minhasFilas.length > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-amber-500 text-white border-none py-0 px-1.5 h-4 min-w-[20px] rounded-full flex items-center justify-center text-xs">
                    {minhasFilas.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="nova-solicitacao"
                className="rounded-lg font-bold data-[state=active]:bg-[#2D5016] data-[state=active]:text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2 hidden sm:block" /> Nova Solicitação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meus-agendamentos" className="space-y-8">
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-[#2D5016]" /></div>
              ) : agendamentos.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Calendar className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-bold uppercase text-xs">Nenhuma visita encontrada</p>
                  <Button onClick={() => setActiveTab('nova-solicitacao')} className="mt-4 bg-[#2D5016]">Agendar Primeira Visita</Button>
                </div>
              ) : (
                <div className="space-y-10">

                  {/* NOVO BOTÃO DE INFORMAÇÃO PARA MENORES DE IDADE */}
                  <div className="mb-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowMenoresModal(true)}
                      className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Info className="w-4 h-4" /> Agendamento para Menores
                    </Button>
                  </div>

                  {/* PRÓXIMAS VISITAS (SEMPRE VISÍVEIS) */}
                  {categorias.ativos.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 ml-1">
                        <CheckCircle2 className="w-3 h-3 text-[#2D5016]" /> Próximas Visitas
                      </h2>
                      <div className="grid gap-4">{categorias.ativos.map(RenderAgendamentoCard)}</div>
                    </div>
                  )}

                  {/* HISTÓRICO (PAGINADO) */}
                  {categorias.historico.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 ml-1">
                        <History className="w-3 h-3" /> Histórico de Visitas
                      </h2>

                      <div className="grid gap-4 opacity-75 grayscale-[0.5]">{categorias.historico.map(RenderAgendamentoCard)}</div>

                      {/* CONTROLES DE PAGINAÇÃO DO HISTÓRICO */}
                      {categorias.totalHistorico > pageSize && (
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-4">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Página {page + 1} de {categorias.totalPages}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.max(0, p - 1))}
                              disabled={page === 0}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => p + 1)}
                              disabled={page + 1 >= categorias.totalPages}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="fila-espera" className="space-y-8">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-6">
                <div className="bg-amber-500 p-2 rounded-full shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900 leading-tight uppercase">Fila de Espera Ativa</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Você está na fila para datas em que o agendamento já esgotou as vagas no momento. <strong className="text-amber-900">Se houver desistências</strong> e a vaga abrir, e você for o primeiro da fila, a administração aprovará manualmente a sua tentativa. <strong>Fique atento aqui!</strong>
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-[#2D5016]" /></div>
              ) : minhasFilas.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Clock className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-bold uppercase text-xs">Você não está em nenhuma fila de espera</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {minhasFilas.map((fila) => (
                    <Card key={fila.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group bg-white">
                      <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className={`p-6 flex flex-col items-center justify-center min-w-[120px] text-center bg-blue-50 border-l-4 border-blue-500`}>
                          <span className="text-2xl font-black text-blue-900 leading-none mb-1 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                            #{fila.posicao}
                          </span>
                          <span className="text-xs font-bold uppercase text-blue-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                            Sua Posição
                          </span>
                        </div>

                        <div className="flex-1 p-5 bg-white flex flex-col justify-center">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-gray-50 rounded-full">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 leading-tight">{fila.nome_preso}</h3>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter">
                                  Matrícula: {fila.matricula_preso}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                if (window.confirm("Você tem certeza que deseja cancelar sua posição nesta fila?")) {
                                  handleCancelarFila(fila.id);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Sair da Fila
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-3">
                            {fila.vagas_configuracao && (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-400 font-bold uppercase">Data Reservada</span>
                                  <span className="text-sm font-bold text-gray-700">
                                    {new Date(fila.vagas_configuracao.data_visita + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-400 font-bold uppercase">Horário</span>
                                  <span className="text-sm font-bold text-gray-700">
                                    {fila.vagas_configuracao.horario?.slice(0, 5)}H
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-400 font-bold uppercase">Galeria</span>
                                  <span className="text-sm font-bold text-gray-700 uppercase">
                                    {fila.vagas_configuracao.galeria}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-400 font-bold uppercase">Modalidade</span>
                                  <span className="text-sm font-bold text-gray-700 capitalize">
                                    {fila.vagas_configuracao.tipo_visita?.replace('_', ' ')}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="nova-solicitacao" className="space-y-6">
              <div className="bg-amber-50 text-amber-900 py-4 px-6 shadow-sm rounded-xl border border-amber-200 animate-in fade-in slide-in-from-top-2 duration-500">
                <p className="text-sm font-bold flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
                  <span className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs font-black uppercase shrink-0 shadow-sm">Aviso</span>
                  ⚠️ Limite de 3 visitas sociais por mês e 2 visitas íntimas por mês por DETENTO, e no máximo 5 solicitações por mês por VISITANTE.
                </p>
              </div>
              <AgendamentoModal onSuccess={() => { setActiveTab("meus-agendamentos"); setPage(0); fetchData(); }} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* MODAL DE INFORMAÇÕES SOBRE MENORES */}
      <Dialog open={showMenoresModal} onOpenChange={setShowMenoresModal}>
        <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#2D5016] uppercase tracking-tight flex items-center gap-2">
              <Info className="w-5 h-5" /> Agendamento para Menores de Idade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed py-2">
            <p>
              Menores de idade <strong>não têm permissão</strong> para se cadastrarem diretamente no sistema. Não utilize data de nascimento falsa com o CPF do menor!
            </p>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-xs font-bold uppercase tracking-wider">
              ⚠️ As informações cadastradas DEVEM ser estritamente verdadeiras.
            </div>

            <div>
              <p className="font-bold text-gray-900 mt-4 mb-2 uppercase text-xs tracking-widest">Como proceder:</p>
              <ol className="list-decimal ml-5 space-y-2">
                <li>O <strong>Pai, Mãe ou Responsável Legal</strong> deve fazer o cadastro no portal usando a sua própria carteirinha válida.</li>
                <li>No momento de solicitar o agendamento da visita, o sistema permitirá adicionar <strong>"Visitante 2"</strong> e <strong>"Visitante 3"</strong>.</li>
                <li>Insira o prontuário dos menores nesses campos adicionais <br /><span className="text-xs text-gray-500">(Lembrando: apenas pai, mãe ou responsável legal podem realizar esta inclusão)</span>.</li>
              </ol>
            </div>

            <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
              Consulte nossa <Link to="/politica-privacidade" className="text-[#2D5016] font-bold hover:underline">Política de Privacidade</Link> para mais informações.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMenoresModal(false)} className="bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold uppercase text-xs tracking-widest">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendamentosPage;