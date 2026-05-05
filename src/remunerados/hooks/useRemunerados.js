import { useState, useCallback } from 'react';
import { remuneradosService } from '../services/remuneradosService';
import { remuneradosAdminService } from '../services/remuneradosAdminService';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { addDays, addMonths, format } from 'date-fns';

export const useRemunerados = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  
  // Clear separation of states
  const [vagasDisponiveis, setVagasDisponiveis] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bancoHoras, setBancoHoras] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [solicitacoesBancoHoras, setSolicitacoesBancoHoras] = useState([]);
  const [solicitacoesUsoHoras, setSolicitacoesUsoHoras] = useState([]);
  const [agendaEventos, setAgendaEventos] = useState([]);

  const fetchVagas = useCallback(async (tipo = null, data = null) => {
    setLoading(true);
    setError(null);
    const res = await remuneradosService.getVagasDisponiveis(tipo, data);
    if (res.success) setVagasDisponiveis(res.data);
    else setError(res.error);
    setLoading(false);
    return res;
  }, []);

  const solicitarServico = useCallback(async (solicitacoes) => {
    setLoading(true);
    setError(null);
    const res = await remuneradosService.solicitarServico(solicitacoes);
    if (!res.success) {
      const msg = res.error.includes("duplicate key") ? "Você já está escalado para esta data/turno." : res.error;
      setError(msg);
      toast({ variant: "destructive", title: "Erro", description: msg });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const cancelarServicoServidor = useCallback(async (agendamentoId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agendamentos_remunerados')
        .delete()
        .eq('id', agendamentoId)
        .eq('status', 'pendente');

      if (error) throw error;
      toast({ title: "Cancelado", description: "Seu agendamento pendente foi cancelado." });
      return { success: true };
    } catch (err) {
      console.error("Erro ao cancelar servico:", err);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível cancelar o agendamento." });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchServicos = useCallback(async (servidor_id) => {
    setLoading(true);
    setError(null);
    const res = await remuneradosService.listarServicosServidor(servidor_id);
    if (res.success) setServicos(res.data);
    else setError(res.error);
    setLoading(false);
    return res;
  }, []);

  const fetchBancoHoras = useCallback(async (servidorId) => {
    try {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('*')
        .eq('servidor_id', servidorId)
        .maybeSingle();

      if (error) throw error;
      setBancoHoras(data || { saldo: 0 });
    } catch (err) {
      console.error("Erro ao buscar banco de horas:", err);
      setBancoHoras({ saldo: 0 });
    }
  }, []);

  const fetchMetricas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await remuneradosService.listarMetricasAdmin();
    if (res.success) setMetricas(res.data);
    else setError(res.error);
    setLoading(false);
    return res;
  }, []);

  // --- NEW FUNCTIONS FOR SOLICITAÇÕES BANCO HORAS ---

  const fetchSolicitacoes = useCallback(async (servidorId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitacoes_banco_horas')
        .select('*')
        .eq('servidor_id', servidorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitacoesBancoHoras(data || []);
      return { success: true, data };
    } catch (err) {
      console.error("Erro ao buscar solicitacoes:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSolicitacoesAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const res = await remuneradosAdminService.fetchSolicitacoesAdmin();
      if (res.success) {
        setSolicitacoesBancoHoras(res.data || []);
        console.log("✅ SOLICITACOES BANCO HORAS CARREGADAS:", res.data);
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error("Erro solicitacoes admin:", err);
      // Do not zero out existing data on error to prevent UI flicker
    } finally {
      setLoading(false);
    }
  }, []);

  const criarSolicitacao = useCallback(async (servidorId, horas, tipo, motivo, observacao) => {
    try {
      setLoading(true);
      if (horas <= 0) throw new Error("Horas devem ser maiores que zero.");
      if (!motivo) throw new Error("Motivo é obrigatório.");
      if (!['escolta', 'extra', 'outro'].includes(tipo)) throw new Error("Tipo inválido.");

      const { data, error } = await supabase
        .from('solicitacoes_banco_horas')
        .insert([{
          servidor_id: servidorId,
          horas: parseFloat(horas),
          tipo,
          motivo,
          observacao
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      
      // Update local state smoothly
      setSolicitacoesBancoHoras(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error("Erro ao criar solicitacao:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelarSolicitacaoHorasServidor = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_banco_horas')
        .delete()
        .eq('id', id)
        .eq('status', 'pendente');

      if (error) throw error;
      
      setSolicitacoesBancoHoras(prev => prev.filter(sol => sol.id !== id));
      toast({ title: "Cancelado", description: "Sua solicitação de crédito de horas foi cancelada." });
      return { success: true };
    } catch (err) {
      console.error("Erro ao cancelar solicitação:", err);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível cancelar a solicitação." });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

    const criarUsoHoras = useCallback(async (servidorId, horas, dataUso, observacao) => {
    try {
      setLoading(true);

      if (!horas || horas <= 0) {
        throw new Error("Horas devem ser maiores que zero.");
      }

      if (!dataUso) {
        throw new Error("Data de uso é obrigatória.");
      }

      // 🔴 valida saldo antes de enviar
      const { data: saldoAtual } = await supabase
        .from('banco_horas')
        .select('saldo')
        .eq('servidor_id', servidorId)
        .maybeSingle();

      if (saldoAtual && saldoAtual.saldo < horas) {
        throw new Error("Saldo insuficiente.");
      }

      const { data, error } = await supabase
        .from('uso_horas')
        .insert([{
          servidor_id: servidorId,
          horas: parseFloat(horas),
          data_uso: dataUso,
          observacao,
          status: 'pendente'
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      setSolicitacoesUsoHoras(prev => [data, ...prev]);

      return { success: true, data };

    } catch (err) {
      console.error("Erro ao solicitar uso de horas:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelarUsoHorasServidor = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('uso_horas')
        .delete()
        .eq('id', id)
        .eq('status', 'pendente');

      if (error) throw error;

      setSolicitacoesUsoHoras(prev => prev.filter(sol => sol.id !== id));
      toast({ title: "Cancelado", description: "Sua solicitação de uso de horas foi cancelada." });
      return { success: true };
    } catch (err) {
      console.error("Erro ao cancelar uso de horas:", err);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível cancelar o uso de horas." });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchUsoHoras = useCallback(async (servidorId) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('uso_horas')
        .select('*')
        .eq('servidor_id', servidorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSolicitacoesUsoHoras(data || []);

      return { success: true, data };

    } catch (err) {
      console.error("Erro ao buscar uso de horas:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const aprovarUsoHoras = useCallback(async (solicitacao) => {
    try {
      setLoading(true);

      // 1️⃣ atualizar status
      const { error: updateError } = await supabase
        .from('uso_horas')
        .update({
          status: 'aprovado',
          aprovado_em: new Date().toISOString()
        })
        .eq('id', solicitacao.id);

      if (updateError) throw updateError;

      // 2️⃣ diminuir saldo
      const { data: saldoAtual } = await supabase
        .from('banco_horas')
        .select('saldo')
        .eq('servidor_id', solicitacao.servidor_id)
        .maybeSingle();

      const novoSaldo = (saldoAtual?.saldo || 0) - solicitacao.horas;

      const { error: saldoError } = await supabase
        .from('banco_horas')
        .update({ saldo: novoSaldo })
        .eq('servidor_id', solicitacao.servidor_id);

      if (saldoError) throw saldoError;

      // 3️⃣ histórico
      await supabase.from('movimentacao_horas').insert([{
        servidor_id: solicitacao.servidor_id,
        tipo: 'debito',
        horas: solicitacao.horas,
        motivo: 'Uso de horas',
        origem: 'uso_horas'
      }]);

      toast({ title: "Uso aprovado", description: "Horas descontadas com sucesso." });

      return { success: true };

    } catch (err) {
      console.error("Erro ao aprovar uso:", err);
      toast({ variant: "destructive", title: "Erro", description: err.message });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const aprovarSolicitacao = useCallback(async (solicitacaoId, servidorId, horas) => {
    setLoading(true);
    const res = await remuneradosAdminService.aprovarSolicitacaoHoras(solicitacaoId, servidorId, horas);
    if (res.success) {
      toast({ title: "Sucesso", description: "Solicitação aprovada e saldo atualizado." });
      await fetchSolicitacoesAdmin(); // Reload list
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error });
    }
    setLoading(false);
    return res;
  }, [toast, fetchSolicitacoesAdmin]);

  const recusarSolicitacao = useCallback(async (solicitacaoId, observacao = '') => {
    setLoading(true);
    const res = await remuneradosAdminService.recusarSolicitacaoHoras(solicitacaoId, observacao);
    if (res.success) {
      toast({ title: "Sucesso", description: "Solicitação recusada." });
      await fetchSolicitacoesAdmin(); // Reload list
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error });
    }
    setLoading(false);
    return res;
  }, [toast, fetchSolicitacoesAdmin]);

  const fetchAgendaEventos = useCallback(async (servidorId) => {
    setLoading(true);
    const res = await remuneradosService.fetchAgendaEventos(servidorId);
    if (res.success) setAgendaEventos(res.data);
    else {
      setError(res.error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao buscar agenda." });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const createAgendaEvento = useCallback(async (payload) => {
    setLoading(true);
    const res = await remuneradosService.createAgendaEvento(payload);
    if (res.success) {
      setAgendaEventos(prev => [...prev, res.data]);
      toast({ title: "Evento Criado", description: "Adicionado à sua agenda com sucesso.", className: "bg-[#2D5016] text-white" });
    } else {
      setError(res.error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar evento." });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const deleteAgendaEvento = useCallback(async (eventoId) => {
    setLoading(true);
    const res = await remuneradosService.deleteAgendaEvento(eventoId);
    if (res.success) {
      setAgendaEventos(prev => prev.filter(e => e.id !== eventoId));
      toast({ title: "Evento Removido", description: "Removido da agenda com sucesso." });
    } else {
      setError(res.error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover evento." });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const limparEscalaPlantao = useCallback(async (servidorId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agenda_servidor')
        .delete()
        .eq('servidor_id', servidorId)
        .eq('titulo', 'Escala de Plantão Automática');
      
      if (error) throw error;
      
      setAgendaEventos(prev => prev.filter(e => !(e.servidor_id === servidorId && e.titulo === 'Escala de Plantão Automática')));
      return { success: true };
    } catch (err) {
      console.error("Erro ao limpar escala de plantão:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const marcarEscalaPlantao = useCallback(async (servidorId, dataInicio, plantaoCor) => {
    setLoading(true);
    try {
      // 1. Limpa escala anterior para evitar duplicações
      await limparEscalaPlantao(servidorId);

      // 2. Gera as datas (24x72 significa 1 dia sim, 3 não -> ciclo de 4 dias)
      const dataLimite = addMonths(dataInicio, 6);
      let dataAtual = dataInicio;
      const novosEventos = [];

      while (dataAtual <= dataLimite) {
        novosEventos.push({
          servidor_id: servidorId,
          data: format(dataAtual, 'yyyy-MM-dd'),
          titulo: 'Escala de Plantão Automática',
          cor: plantaoCor,
          hora_inicio: null
        });
        // Pula 4 dias (1 de trabalho + 3 de folga = próximo plantão no 4º dia)
        dataAtual = addDays(dataAtual, 4);
      }

      // 3. Insere no banco
      const { data, error } = await supabase
        .from('agenda_servidor')
        .insert(novosEventos)
        .select();

      if (error) throw error;

      // 4. Atualiza estado local
      if (data) {
        setAgendaEventos(prev => [...prev, ...data]);
      }
      
      toast({ title: "Escala Gerada", description: "Sua escala de plantão foi gerada para os próximos 6 meses.", className: "bg-[#2D5016] text-white" });
      return { success: true, data };
    } catch (err) {
      console.error("Erro ao gerar escala de plantão:", err);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar a escala automática." });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [limparEscalaPlantao, toast]);

  return {
    vagasDisponiveis,
    servicos,
    bancoHoras,
    metricas,
    solicitacoesBancoHoras,
    solicitacoesUsoHoras,
    agendaEventos,
    loading,
    error,
    fetchVagas,
    solicitarServico,
    cancelarServicoServidor,
    fetchServicos,
    fetchBancoHoras,
    fetchMetricas,
    fetchSolicitacoes,
    fetchSolicitacoesAdmin,
    criarSolicitacao,
    cancelarSolicitacaoHorasServidor,
    aprovarSolicitacao,
    recusarSolicitacao,
    criarUsoHoras,
    cancelarUsoHorasServidor,
    fetchUsoHoras,
    aprovarUsoHoras,
    aprovarUsoHoras,
    fetchAgendaEventos,
    createAgendaEvento,
    deleteAgendaEvento,
    limparEscalaPlantao,
    marcarEscalaPlantao
  };
};