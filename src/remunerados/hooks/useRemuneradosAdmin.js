import { useState, useCallback } from 'react';
import { remuneradosAdminService } from '../services/remuneradosAdminService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export const useRemuneradosAdmin = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAdminServidorId = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return null;
    
    const { data: admin } = await supabase
      .from('servidores')
      .select('id, role')
      .eq('user_id', session.session.user.id)
      .maybeSingle();
      
    if (admin?.role !== 'admin') {
      const { data: profile } = await supabase.from('perfis').select('role').eq('id', session.session.user.id).single();
      if (profile?.role !== 'admin') return null;
    }
      
    return admin?.id;
  };

  const fetchDashboardMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: servicos } = await supabase.from('vw_agendamentos_admin').select('tipo, status');
      const { data: solicitacoes } = await supabase.from('vw_solicitacoes_banco_horas_admin').select('horas, status');
      const { data: debitos } = await supabase.from('uso_horas').select('status');
      const { data: servidoresData, count: activeStaff } = await supabase.from('servidores').select('id, plantao', { count: 'exact' }).eq('ativo', true);
      const { data: vagas } = await supabase.from('vagas_remunerados').select('vagas_totais, vagas_ocupadas');

      const aprovados = servicos?.filter(s => s.status === 'aprovado' || s.status === 'reagendado') || [];
      const completedServices = aprovados.length;
      const totalRD = aprovados.filter(s => s.tipo === 'RD').length;
      const totalRN = aprovados.filter(s => s.tipo === 'RN').length;

      const aprovadasHoras = solicitacoes?.filter(s => s.status === 'aprovado') || [];
      const bancoHorasTotal = aprovadasHoras.reduce((acc, s) => acc + (s.horas || 0), 0);
      
      const pendingCreditos = solicitacoes?.filter(s => s.status === 'pendente').length || 0;
      const pendingDebitos = debitos?.filter(s => s.status === 'pendente').length || 0;
      const pendingAgendamentos = servicos?.filter(s => s.status === 'pendente').length || 0;
      const pendingRequests = pendingCreditos + pendingDebitos + pendingAgendamentos;

      const staffCount = activeStaff || 0;
      const avgServices = staffCount > 0 ? (completedServices / staffCount).toFixed(1) : 0;

      const totalVagas = vagas?.reduce((acc, v) => acc + (v.vagas_totais || 0), 0) || 0;
      const ocupadasVagas = vagas?.reduce((acc, v) => acc + (v.vagas_ocupadas || 0), 0) || 0;
      const occupancyRate = totalVagas > 0 ? Math.round((ocupadasVagas / totalVagas) * 100) : 0;

      const plantaoDistribution = {};
      servidoresData?.forEach(s => {
        const p = s.plantao || 'Não definido';
        plantaoDistribution[p] = (plantaoDistribution[p] || 0) + 1;
      });

      const metrics = {
        occupancyRate,
        completedServices,
        activeStaff: staffCount,
        avgServices,
        chart: { RD: totalRD, RN: totalRN },
        bancoHorasTotal,
        pendingRequests,
        plantaoDistribution
      };

      return { success: true, data: metrics };
    } catch (error) {
      console.error("Error fetching metrics:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // CALENDAR & ESCALA FUNCTIONS
  const fetchCalendarioData = useCallback(async (mes, ano) => {
    setLoading(true);
    try {
      const startDate = format(new Date(ano, mes - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(ano, mes - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('vw_calendario_remunerados')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Erro fetchCalendarioData:", error);
      toast({ title: "Erro", description: "Falha ao carregar dados do calendário.", variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchServidoresAtivos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('servidores')
        .select('id, nome, matricula')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Erro fetchServidoresAtivos:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const removerServidorEscala = useCallback(async (agendamentoId) => {
    setLoading(true);
    try {
      const res = await remuneradosAdminService.cancelarServico(agendamentoId, 'Removido via painel de escalas');
      if (!res.success) throw new Error(res.error);
      
      toast({ title: "Removido", description: "Servidor removido da escala com sucesso." });
      return { success: true };
    } catch (error) {
      console.error("Erro removerServidorEscala:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const substituirServidorEscala = useCallback(async (agendamentoId, novoServidorId, data, tipo) => {
    setLoading(true);
    try {
      const adminId = await getAdminServidorId();
      if (!adminId) throw new Error("Acesso negado.");

      const { count } = await supabase
        .from('agendamentos_remunerados')
        .select('id', { count: 'exact' })
        .eq('data', data)
        .eq('tipo', tipo)
        .eq('servidor_id', novoServidorId)
        .in('status', ['aprovado', 'pendente', 'reagendado']);

      if (count && count > 0) {
        throw new Error("O servidor selecionado já está escalado para este dia e turno.");
      }

      const { error } = await supabase
        .from('agendamentos_remunerados')
        .update({ 
          servidor_id: novoServidorId, 
          alterado_por: adminId, 
          alterado_em: new Date().toISOString(),
          motivo_alteracao: 'Substituição de servidor'
        })
        .eq('id', agendamentoId);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Servidor substituído com sucesso." });
      return { success: true };
    } catch (error) {
      console.error("Erro substituirServidorEscala:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const reagendarServidor = useCallback(async (agendamentoId, novaData, tipo, dataAtual) => {
    setLoading(true);
    try {
      if (novaData === dataAtual) {
        throw new Error("A nova data deve ser diferente da data atual.");
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const nd = new Date(novaData + 'T12:00:00Z');
      nd.setHours(0, 0, 0, 0);
      
      if (nd < hoje) {
        throw new Error("Não é possível reagendar para uma data passada.");
      }

      const adminId = await getAdminServidorId();
      if (!adminId) throw new Error("Acesso negado.");

      const { data: vaga, error: vagaError } = await supabase
        .from('vw_calendario_remunerados')
        .select('vagas_totais, vagas_ocupadas')
        .eq('data', novaData)
        .eq('tipo', tipo)
        .maybeSingle();

      if (vagaError && vagaError.code !== 'PGRST116') throw vagaError;

      if (!vaga || vaga.vagas_totais === 0) {
        throw new Error(`Não existem vagas configuradas para o turno ${tipo} no dia ${format(nd, 'dd/MM/yyyy')}.`);
      }

      if (vaga.vagas_ocupadas >= vaga.vagas_totais) {
        throw new Error(`O turno ${tipo} no dia ${format(nd, 'dd/MM/yyyy')} já está com a capacidade máxima (${vaga.vagas_totais} vagas).`);
      }

      const { data: currentAgendamento, error: fetchErr } = await supabase
        .from('agendamentos_remunerados')
        .select('servidor_id, data_original')
        .eq('id', agendamentoId)
        .single();
        
      if (fetchErr) throw fetchErr;
      
      const { count } = await supabase
        .from('agendamentos_remunerados')
        .select('id', { count: 'exact' })
        .eq('data', novaData)
        .eq('tipo', tipo)
        .eq('servidor_id', currentAgendamento.servidor_id)
        .in('status', ['aprovado', 'pendente', 'reagendado']);

      if (count && count > 0) {
        throw new Error("Este servidor já possui um agendamento ativo para a nova data e turno.");
      }

      const { error: updateError } = await supabase
        .from('agendamentos_remunerados')
        .update({ 
          data: novaData, 
          data_original: currentAgendamento.data_original || dataAtual,
          alterado_por: adminId, 
          alterado_em: new Date().toISOString(),
          status: 'reagendado',
          motivo_alteracao: `Reagendado do dia ${format(new Date(dataAtual + 'T12:00:00Z'), 'dd/MM/yyyy')} para ${format(nd, 'dd/MM/yyyy')}`
        })
        .eq('id', agendamentoId);

      if (updateError) throw updateError;
      
      toast({ title: "Sucesso", description: "Servidor reagendado com sucesso." });
      return { success: true };
    } catch (error) {
      console.error("Erro reagendarServidor:", error);
      toast({ title: "Erro ao Reagendar", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const adicionarServidorEscala = useCallback(async (solicitacoes) => {
    setLoading(true);
    try {
      const adminId = await getAdminServidorId();
      if (!adminId) throw new Error("Acesso negado.");

      const payload = [];

      for (const sol of solicitacoes) {
        // Validação básica de vaga
        const { data: vaga } = await supabase
          .from('vw_calendario_remunerados')
          .select('vagas_totais, vagas_ocupadas')
          .eq('data', sol.data)
          .eq('tipo', sol.tipo)
          .maybeSingle();
          
        if (!vaga || vaga.vagas_totais === 0) {
          throw new Error(`Não existem vagas configuradas para o dia ${sol.data} e turno ${sol.tipo}.`);
        }
        
        // Verificação se servidor já está escalado NESSE TURNO ESPECÍFICO
        const { count } = await supabase
          .from('agendamentos_remunerados')
          .select('id', { count: 'exact' })
          .eq('data', sol.data)
          .eq('tipo', sol.tipo)
          .eq('turno', sol.turno)
          .eq('servidor_id', sol.servidor_id)
          .in('status', ['aprovado', 'pendente', 'reagendado']);

        if (count && count > 0) {
          throw new Error("Este servidor já está escalado nesta data e turno.");
        }

        payload.push({
          data: sol.data,
          tipo: sol.tipo,
          turno: sol.turno, // Adicionado turno
          servidor_id: sol.servidor_id,
          status: 'aprovado', // Admin insere como aprovado direto
          observacao: 'Adicionado manualmente via painel',
          alterado_por: adminId,
          alterado_em: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('agendamentos_remunerados')
        .insert(payload);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Servidor(es) adicionado(s) à escala." });
      return { success: true };
    } catch (error) {
      console.error("Erro adicionarServidorEscala:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // VAGAS MANAGEMENT
  const fetchVagas = useCallback(async (filters, page = 0, limit = 10) => {
    setLoading(true);
    const res = await remuneradosAdminService.fetchVagas(filters, page, limit);
    if (!res.success) toast({ title: "Erro ao buscar vagas", description: res.error, variant: "destructive" });
    setLoading(false);
    return res;
  }, [toast]);

  const createVaga = useCallback(async (payload) => {
    setLoading(true);
    const res = await remuneradosAdminService.createVaga(payload);
    if (res.success) {
      toast({ title: "Sucesso", description: "Vaga criada com sucesso." });
    } else {
      toast({ title: "Erro ao criar vaga", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const updateVaga = useCallback(async (id, payload) => {
    setLoading(true);
    const res = await remuneradosAdminService.updateVaga(id, payload);
    if (res.success) {
      toast({ title: "Sucesso", description: "Vaga atualizada com sucesso." });
    } else {
      toast({ title: "Erro ao atualizar vaga", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const deleteVaga = useCallback(async (id) => {
    setLoading(true);
    const res = await remuneradosAdminService.deleteVaga(id);
    if (res.success) {
      toast({ title: "Sucesso", description: "Vaga removida com sucesso." });
    } else {
      toast({ title: "Erro ao remover vaga", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const generateMonthlySchedule = useCallback(async (year, month, rdCount, rnCount) => {
    setLoading(true);
    const res = await remuneradosAdminService.generateMonthlySchedule(year, month, rdCount, rnCount);
    if (res.success) {
      toast({ title: "Sucesso", description: "Agenda gerada com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  // APPROVAL MANAGEMENT
  const fetchAllServicos = useCallback(async () => {
    setLoading(true);
    const res = await remuneradosAdminService.fetchAllServicos();
    if (!res.success) toast({ title: "Erro", description: "Falha ao carregar serviços.", variant: "destructive" });
    setLoading(false);
    return res;
  }, [toast]);

  const updateApprovalStatus = useCallback(async (id, status, observacao) => {
    setLoading(true);
    const res = await remuneradosAdminService.updateApprovalStatus(id, status, observacao);
    if (res.success) {
      toast({ title: "Sucesso", description: `Status atualizado para ${status}.` });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const cancelarServico = useCallback(async (id, motivo) => {
    setLoading(true);
    const res = await remuneradosAdminService.cancelarServico(id, motivo);
    if (res.success) {
      toast({ title: "Cancelado", description: "Agendamento cancelado com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const reagendarServico = useCallback(async (id, novaData, motivo) => {
    setLoading(true);
    const res = await remuneradosAdminService.reagendarServico(id, novaData, motivo);
    if (res.success) {
      toast({ title: "Reagendado", description: "Data alterada com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  // BANCO DE HORAS
  const fetchSolicitacoesAdmin = useCallback(async () => {
    setLoading(true);
    const res = await remuneradosAdminService.fetchSolicitacoesAdmin();
    if (!res.success) toast({ title: "Erro", description: "Falha ao carregar banco de horas.", variant: "destructive" });
    setLoading(false);
    return res;
  }, [toast]);

  const aprovarSolicitacaoHoras = useCallback(async (id, servidorId, horas) => {
    setLoading(true);
    const res = await remuneradosAdminService.aprovarSolicitacaoHoras(id, servidorId, horas);
    if (res.success) {
      toast({ title: "Aprovado", description: "Horas creditadas com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const recusarSolicitacaoHoras = useCallback(async (id, observacao = '') => {
    setLoading(true);
    const res = await remuneradosAdminService.recusarSolicitacaoHoras(id, observacao);
    if (res.success) {
      toast({ title: "Recusado", description: "Solicitação recusada." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  const fetchUsoHorasAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('uso_horas')
        .select(`
          *,
          servidores(nome, matricula, plantao)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // normaliza igual ao padrão do resto do sistema
      const formatted = (data || []).map(item => ({
        ...item,
        servidor_nome: item.servidores?.nome,
        servidor_matricula: item.servidores?.matricula,
        servidor_plantao: item.servidores?.plantao
      }));

      return { success: true, data: formatted };

    } catch (error) {
      console.error("Erro fetchUsoHorasAdmin:", error);
      toast({ title: "Erro", description: "Falha ao carregar uso de horas.", variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const aprovarUsoHoras = useCallback(async (sol) => {
    setLoading(true);
    try {
      // 1️⃣ buscar saldo atual (Validação preemptiva)
      const { data: saldoAtual } = await supabase
        .from('banco_horas')
        .select('saldo')
        .eq('servidor_id', sol.servidor_id)
        .maybeSingle();

      const novoSaldo = (saldoAtual?.saldo || 0) - sol.horas;

      if (novoSaldo < 0) {
        throw new Error("Saldo insuficiente para aprovação.");
      }

      // 2️⃣ atualizar status (O trigger do Supabase agora vai descontar o banco_horas logar a movimentacao_horas nativamente)
      const { error: updateError } = await supabase
        .from('uso_horas')
        .update({
          status: 'aprovado',
          aprovado_em: new Date().toISOString()
        })
        .eq('id', sol.id);

      if (updateError) throw updateError;

      toast({ title: "Sucesso", description: "Uso de horas aprovado." });

      return { success: true };

    } catch (error) {
      console.error("Erro aprovarUsoHoras:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const recusarUsoHoras = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('uso_horas')
        .update({ status: 'recusado' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Recusado", description: "Solicitação de uso recusada." });

      return { success: true };

    } catch (error) {
      console.error("Erro recusarUsoHoras:", error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRelatorioData = useCallback(async (ano, mes) => {
    setLoading(true);
    const res = await remuneradosAdminService.fetchRelatorioData(ano, mes);
    if (!res.success) toast({ title: "Erro", description: "Falha ao carregar dados de produtividade.", variant: "destructive" });
    setLoading(false);
    return res;
  }, [toast]);

  const fetchServidores = useCallback(async (search) => {
    setLoading(true);
    const res = await remuneradosAdminService.fetchServidores(search);
    setLoading(false);
    return res;
  }, []);

  const updateServidor = useCallback(async (id, payload) => {
    setLoading(true);
    const res = await remuneradosAdminService.updateServidor(id, payload);
    if (res.success) {
      toast({ title: "Sucesso", description: "Dados do servidor atualizados." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setLoading(false);
    return res;
  }, [toast]);

  return {
    loading,
    fetchDashboardMetrics,
    fetchCalendarioData,
    fetchServidoresAtivos,
    removerServidorEscala,
    substituirServidorEscala,
    reagendarServidor,
    adicionarServidorEscala,
    
    fetchVagas,
    createVaga,
    updateVaga,
    deleteVaga,
    generateMonthlySchedule,
    
    fetchAllServicos,
    updateApprovalStatus,
    cancelarServico,
    reagendarServico,
    
    fetchSolicitacoesAdmin,
    aprovarSolicitacaoHoras,
    recusarSolicitacaoHoras,

    fetchUsoHorasAdmin,
    aprovarUsoHoras,
    recusarUsoHoras,
    fetchRelatorioData,
    fetchServidores,
    updateServidor,
    getAdminServidorId
  };
};