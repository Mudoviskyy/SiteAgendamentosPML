import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { cancelarAgendamentoVisitante } from '@/services/agendamentosService';

const MeusAgendamentos = () => {
  const { user, profile } = useAuth();
  const { agendamentos, fetchUserAgendamentos } = useAgendamentos();

  const [pageHistorico, setPageHistorico] = useState(0);
  const pageSizeHistorico = 5;

  const { toast } = useToast();
  const [cancelandoId, setCancelandoId] = useState(null);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);

  useEffect(() => {
    if (user) fetchUserAgendamentos(user.id);
  }, [user, fetchUserAgendamentos]);

  // LÓGICA DE ORDENAÇÃO E FILTRAGEM REFINADA
  const sortedAgendamentos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Ordena do mais recente para o mais antigo
    const data = [...agendamentos].sort(
      (a, b) => new Date(b.data_visita) - new Date(a.data_visita)
    );

    return {
      ativos: data.filter(a => {
        const dataVisita = new Date(a.data_visita + 'T00:00:00'); // Garante fuso horário local

        // Regra 1: Se estiver PENDENTE, fica em ativos independente da data
        if (a.status === 'pendente') return true;

        // Regra 2: Se estiver APROVADO, fica em ativos apenas se for hoje ou futuro
        if (a.status === 'aprovado' && dataVisita >= hoje) return true;

        return false;
      }),

      historico: data.filter(a => {
        const dataVisita = new Date(a.data_visita + 'T00:00:00');

        // Vai para o histórico se:
        // 1. O status for de finalização (cancelado, recusado, etc)
        // 2. Ou se for um APROVADO que já passou da data
        const isStatusFinalizado = ['cancelado', 'revogado', 'recusado', 'realizado'].includes(a.status);
        const isAprovadoAntigo = a.status === 'aprovado' && dataVisita < hoje;

        return isStatusFinalizado || isAprovadoAntigo;
      })
    };
  }, [agendamentos]);

  const podeCancelar = (dataVisita) => {
    const hoje = new Date();
    const visita = new Date(dataVisita + 'T00:00:00');

    const diffMs = visita - hoje;
    const diffDias = diffMs / (1000 * 60 * 60 * 24);

    return diffDias >= 7;
  };

  const handleCancelarAgendamento = async (agendamento) => {
    try {
      setCancelandoId(agendamento.id);

      await cancelarAgendamentoVisitante(agendamento.id, user.id);
      await fetchUserAgendamentos(user.id);

      toast({
        title: 'Agendamento cancelado',
        description: 'O cancelamento foi realizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);

      toast({
        title: 'Erro ao cancelar',
        description: error?.message || 'Não foi possível cancelar o agendamento.',
        variant: 'destructive',
      });
    } finally {
      setCancelandoId(null);
      setAgendamentoParaCancelar(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700 border-amber-200',
      aprovado: 'bg-green-100 text-green-700 border-green-200',
      recusado: 'bg-red-100 text-red-700 border-red-200',
      cancelado: 'bg-gray-100 text-gray-700 border-gray-200',
      realizado: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return (

      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${styles[status] || styles.cancelado}`} translate="no">
        {status}
      </span>
    );
  };

  // Transformado em um componente interno funcional
  const ListaAgendamentos = ({ items }) => (
    <div className="grid gap-4 mt-4">
      {items.map(a => {
        const bloqueado = !podeCancelar(a.data_visita);

        return (
          <div
            key={a.id}
            className="group relative flex flex-col md:flex-row md:items-center justify-between border border-gray-100 p-5 rounded-xl bg-white hover:shadow-md transition-all border-l-4 border-l-[#2D5016]"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#2D5016]/10 transition-colors">
                  <Calendar className="w-5 h-5 text-[#2D5016]" />
                </div>

                <div>
                  <p className="font-black text-gray-900 leading-none">
                    {new Date(a.data_visita + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-500 font-mono uppercase mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {a.horario}H
                  </p>
                </div>

                <StatusBadge status={a.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 ml-12">
                <p className="text-xs text-gray-600 flex items-center gap-1.5 capitalize">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> {a.tipo_visita?.replaceAll('_', ' ')} - Galeria {a.galeria}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1.5 italic font-medium" translate="no">
                  <User className="w-3.5 h-3.5 text-gray-400" /> Interno: {a.nome_preso} ({a.matricula_preso})
                </p>
              </div>

              {(a.visitante2_nome || a.visitante3_nome) && (
                <div className="ml-12 mt-2 pt-2 border-t border-gray-50 flex flex-col gap-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acompanhantes</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {a.visitante2_nome && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 capitalize" translate="no">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-300" /> {a.visitante2_nome.toLowerCase()}
                      </p>
                    )}
                    {a.visitante3_nome && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 capitalize" translate="no">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-300" /> {a.visitante3_nome.toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!bloqueado && (a.status === 'pendente' || a.status === 'aprovado') && (
                <p className="text-xs text-gray-500 ml-12">
                  Cancelamento disponível até 7 dias antes da visita.
                </p>
              )}

              {bloqueado && (a.status === 'pendente' || a.status === 'aprovado') && (
                <p className="text-xs text-red-500 mt-1 ml-12">
                  Cancelamento bloqueado: permitido somente até 7 dias antes da visita.
                </p>
              )}

              {(a.status === 'recusado' || a.status === 'cancelado' || a.status === 'revogado') && a.motivo_recusa && (
                <div className="mt-4 md:max-w-[250px] bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 leading-tight">
                    <strong>Motivo:</strong> {a.motivo_recusa}
                  </p>
                </div>
              )}
            </div>

            {(a.status === 'pendente' || a.status === 'aprovado') && (
              <div className="mt-4 md:mt-0 md:ml-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAgendamentoParaCancelar(a)}
                  disabled={bloqueado || cancelandoId === a.id}
                  className={`font-bold uppercase text-xs tracking-wider ${bloqueado
                    ? 'border-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                    : 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'
                    }`}
                >
                  {cancelandoId === a.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const historicoPaginado = useMemo(() => {
    const start = pageHistorico * pageSizeHistorico;
    const end = start + pageSizeHistorico;
    return sortedAgendamentos.historico.slice(start, end);
  }, [sortedAgendamentos.historico, pageHistorico]);

  return (
    <>
      <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-800 font-bold uppercase text-sm">Atenção às Faltas</h4>
          <p className="text-amber-700 text-sm mt-1">
            O não comparecimento às visitas agendadas tira a vaga de outro familiar. Evite de não ir no dia da visita.
          </p>
        </div>
      </div>

      <Tabs defaultValue="ativos" className="w-full">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-gray-100/50">
            <TabsTrigger value="ativos" className="data-[state=active]:bg-white data-[state=active]:text-[#2D5016] font-bold">
              Próximas Visitas ({sortedAgendamentos.ativos.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="data-[state=active]:bg-white data-[state=active]:text-gray-700 font-bold">
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ativos">
          {sortedAgendamentos.ativos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Sem visitas pendentes</h3>
              <Link to="/visitante/agendamentos" className="mt-4">
                <Button variant="outline" className="border-[#2D5016] text-[#2D5016]">Agendar Agora</Button>
              </Link>
            </div>
          ) : (
            <ListaAgendamentos items={sortedAgendamentos.ativos} />
          )}
        </TabsContent>

        <TabsContent value="historico">
          {sortedAgendamentos.historico.length === 0 ? (
            <p className="text-center py-10 text-gray-400">Nenhum registro no histórico.</p>
          ) : (
            <>
              <ListaAgendamentos items={historicoPaginado} />

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pageHistorico === 0}
                  onClick={() => setPageHistorico(p => Math.max(0, p - 1))}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Anterior
                </Button>

                <span className="text-xs font-bold text-gray-500 uppercase">
                  Página {pageHistorico + 1} de {Math.ceil(sortedAgendamentos.historico.length / pageSizeHistorico) || 1}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={(pageHistorico + 1) * pageSizeHistorico >= sortedAgendamentos.historico.length}
                  onClick={() => setPageHistorico(p => p + 1)}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Próxima
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {agendamentoParaCancelar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              Confirmar cancelamento
            </h2>

            <p className="text-xs text-gray-600 mb-6">
              Deseja cancelar o agendamento do dia{' '}
              <strong>
                {new Date(
                  agendamentoParaCancelar.data_visita + 'T00:00:00'
                ).toLocaleDateString('pt-BR')}
              </strong>
              ?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setAgendamentoParaCancelar(null)}
              >
                Voltar
              </Button>

              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleCancelarAgendamento(agendamentoParaCancelar)}
                disabled={cancelandoId === agendamentoParaCancelar.id}
              >
                {cancelandoId === agendamentoParaCancelar.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar cancelamento'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );




};

export default MeusAgendamentos;