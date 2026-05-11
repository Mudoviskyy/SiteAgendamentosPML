import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  Trash2,
  Loader2,
  AlertTriangle,
  Clock,
  MessageSquare,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import TicketChat from '@/components/visitante/TicketChat';

const UserApproval = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [fraudAlert, setFraudAlert] = useState(null);
  const [suspects, setSuspects] = useState([]);
  const [activeTab, setActiveTab] = useState('bugs'); // 'bugs' ou 'fraude'

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const { toast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Erro Supabase:', error.message);
        toast({ title: "Erro de Permissão", description: error.message, variant: "destructive" });
        throw error;
      }

      setTickets(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro geral ao buscar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspects = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*, agendamentos_seguranca(*)')
        .eq('status', 'suspeito')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuspects(data || []);

      // Checa se deve mostrar o modal automaticamente (apenas uma vez para o mais recente)
      if (data && data.length > 0) {
        const latestSuspect = data[0];
        const lastSeenId = localStorage.getItem('last_seen_suspect_id');
        
        if (lastSeenId !== latestSuspect.id) {
          setFraudAlert(latestSuspect);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar suspeitos:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchSuspects();

    // 🔴 Monitoramento Anti-Fraude em Tempo Real
    const channel = supabase.channel('fraude-monitor')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public', 
        table: 'agendamentos',
        filter: 'status=eq.suspeito'
      }, (payload) => {
        // Dispara o alerta quando um agendamento entrar como suspeito
        setFraudAlert(payload.new);
        fetchSuspects(); // Atualiza a lista lateral também
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage]);

  const handleCloseAlert = () => {
    if (fraudAlert) {
      localStorage.setItem('last_seen_suspect_id', fraudAlert.id);
      setFraudAlert(null);
    }
  };

  const handleDeleteTicket = async (id) => {
    try {
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Removido", description: "O ticket foi excluído com sucesso." });
      
      if (selectedTicket?.id === id) setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Tem certeza que deseja excluir TODOS os tickets?")) return;
    try {
      const { error } = await supabase.from('tickets').delete().neq('id', 0);
      if (error) throw error;
      toast({ title: "Limpeza concluída", description: "Todos os tickets foram removidos." });
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      toast({ title: "Erro ao excluir todos", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen relative">
      
      {/* 🔴 MODAL DE ALERTA DE FRAUDE EM TEMPO REAL */}
      {fraudAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl border-4 border-red-500 relative animate-in zoom-in-95 duration-300">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-4 shadow-xl shadow-red-500/30">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            
            <div className="mt-8 text-center space-y-4">
              <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">ALERTA DE SEGURANÇA</h2>
              <p className="text-slate-600 font-medium">
                Foi detectado um possível padrão de fraude. Vários agendamentos foram realizados do mesmo endereço IP em um curto intervalo de tempo.
              </p>
              
              <div className="bg-red-50 rounded-2xl p-4 text-left border border-red-100">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Dados Interceptados:</p>
                <p className="text-sm font-bold text-red-900">Interno: <span className="font-medium">{fraudAlert.nome_preso}</span></p>
                <p className="text-sm font-bold text-red-900">Matrícula: <span className="font-medium">{fraudAlert.matricula_preso}</span></p>
                <p className="text-sm font-bold text-red-900 mt-2">Visitante: <span className="font-medium">{fraudAlert.visitante1_nome}</span></p>
                
                {fraudAlert.agendamentos_seguranca && (
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <p className="text-[9px] text-red-500 font-bold">IP: {fraudAlert.agendamentos_seguranca.ip_address}</p>
                  </div>
                )}

                <div className="mt-3 inline-block px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded-full shadow-sm">
                  Status: SUSPEITO
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button 
                onClick={handleCloseAlert}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-widest text-xs h-12 rounded-xl"
              >
                Ciente, Fechar Alerta
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <Bug className="w-8 h-8 text-indigo-600" />
            Central de Auditoria
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie bugs e monitore padrões de fraude</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <Button
            variant={activeTab === 'bugs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('bugs')}
            className={`rounded-xl px-4 py-2 h-auto text-[10px] font-black uppercase tracking-widest ${activeTab === 'bugs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
          >
            Relatos ({totalCount})
          </Button>
          <Button
            variant={activeTab === 'fraude' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('fraude')}
            className={`rounded-xl px-4 py-2 h-auto text-[10px] font-black uppercase tracking-widest ${activeTab === 'fraude' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-400'}`}
          >
            Fraudes ({suspects.length})
            {suspects.length > 0 && <span className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = '/debug'; }}
            className="bg-black text-green-500 hover:bg-slate-900 hover:text-green-400 border-green-500/30 font-mono font-bold uppercase text-[10px] tracking-widest px-4 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
          >
            <Terminal className="w-3 h-3 mr-2" /> Debug
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchTickets(); fetchSuspects(); }}
            disabled={loading}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold uppercase text-xs tracking-widest px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sincronizar Tudo"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Carregando dados...</p>
        </div>
      ) : activeTab === 'bugs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Lista de Reports */}
          <div className="lg:col-span-6 space-y-4">
            {tickets.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">Tudo limpo por aqui!</h3>
                <p className="text-slate-400 text-sm">Nenhum ticket pendente no momento.</p>
              </div>
            ) : (
              <>
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={`border-none shadow-sm rounded-3xl overflow-hidden transition-all hover:shadow-md cursor-pointer ${selectedTicket?.id === ticket.id ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : 'bg-white'}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${ticket.status === 'resolvido' || ticket.status === 'fechado' ? 'bg-green-100' : 'bg-amber-100'}`}>
                            <Bug className={`w-5 h-5 ${ticket.status === 'resolvido' || ticket.status === 'fechado' ? 'text-green-600' : 'text-amber-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Protocolo:</span>
                              <span className="text-xs font-bold text-slate-900">
                                {ticket.protocolo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {new Date(ticket.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={`border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ticket.status === 'resolvido' || ticket.status === 'fechado' ? 'bg-green-50 text-green-600' : ticket.status === 'aguardando_visitante' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                          {ticket.status || 'Aberto'}
                        </Badge>
                      </div>

                      <p className="text-slate-700 text-sm leading-relaxed font-bold mb-1">
                        {ticket.assunto}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           Visitante: {ticket.nome_visitante || 'Desconhecido'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        {ticket.status === 'resolvido' || ticket.status === 'fechado' ? (
                          <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </div>
                        ) : ticket.status === 'aguardando_visitante' ? (
                          <div className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase">
                            <MessageSquare className="w-3 h-3" /> Aguardando Retorno
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-600 text-[10px] font-black uppercase">
                            <AlertTriangle className="w-3 h-3" /> Em Análise
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
                          className="h-8 w-8 p-0 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Paginação */}
                {totalCount > ITEMS_PER_PAGE && (
                  <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                      Total: {totalCount} Reports Encontrados
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1 || loading}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="h-10 w-10 p-0 rounded-xl border-slate-200"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </Button>

                      <div className="flex items-center px-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-[11px] text-slate-600 uppercase tracking-tight">
                        Página {currentPage} de {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE) || loading}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="h-10 w-10 p-0 rounded-xl border-slate-200"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Painel de Detalhes / Resposta */}

          <div className="lg:col-span-6 sticky top-8">
            {selectedTicket ? (
              <TicketChat 
                ticket={selectedTicket} 
                user={user} 
                isVisitor={false}
                onBack={() => setSelectedTicket(null)}
                onStatusChange={(updatedTicket) => {
                   setSelectedTicket(updatedTicket);
                   fetchTickets();
                }}
              />
            ) : (
              <div className="bg-slate-100/50 rounded-[32px] border-2 border-dashed border-slate-200 h-[400px] flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm mb-4">
                  <MessageSquare className="w-6 h-6 text-slate-300" />
                </div>
                <h3 className="text-slate-500 font-bold uppercase text-xs tracking-widest">Selecione um ticket</h3>
                <p className="text-slate-400 text-[11px] mt-2 max-w-[200px]">
                  Clique em um ticket à esquerda para ver os detalhes e iniciar o chat.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-red-50 border border-red-100 p-8 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="bg-red-500 p-4 rounded-3xl shadow-lg shadow-red-200">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-red-900 uppercase tracking-tighter">Fila de Auditoria de Fraude</h2>
                <p className="text-red-700/70 font-medium">Estes agendamentos foram bloqueados automaticamente pelo sistema de IP repetido.</p>
              </div>
            </div>
            <Badge className="bg-red-600 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest">
              {suspects.length} Casos Pendentes
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suspects.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-slate-900 font-bold text-lg">Nenhum caso suspeito</h3>
                <p className="text-slate-400 text-sm">O sistema de segurança está monitorando tudo.</p>
              </div>
            ) : (
              suspects.map((s) => (
                <Card key={s.id} className="bg-white border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-xl transition-all border-t-4 border-red-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                        Alta Probabilidade
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Interno Alvo:</p>
                        <p className="text-sm font-bold text-slate-900">{s.nome_preso}</p>
                        <p className="text-xs text-slate-500">Matrícula: {s.matricula_preso}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dados de Origem:</p>
                        <p className="text-[11px] font-bold text-slate-700 truncate">IP: {s.agendamentos_seguranca?.ip_address || 'N/A'}</p>
                        <p className="text-[11px] text-slate-500 truncate" title={s.agendamentos_seguranca?.user_agent}>UA: {s.agendamentos_seguranca?.user_agent?.slice(0, 30)}...</p>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Aqui poderia abrir a análise detalhada
                            window.location.href = `/admin/agendamentos?search=${s.matricula_preso}`;
                          }}
                          className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest h-10"
                        >
                          Analisar Caso
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserApproval;