
import { supabase } from '@/lib/supabase';

export const remuneradosAdminService = {
  fetchVagas: async (filters = {}, page = 0, limit = 10) => {
    console.log('[remuneradosAdminService.fetchVagas] Iniciando...', { filters, page, limit });
    try {
      let query = supabase.from('vagas_remunerados').select('*', { count: 'exact' });
      
      if (filters.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.data) {
        query = query.eq('data', filters.data);
      }
      
      const from = page * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('data', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      console.log('[remuneradosAdminService.fetchVagas] Sucesso:', data.length, 'registros, total:', count);
      return { success: true, data, count };
    } catch (error) {
      console.error('[remuneradosAdminService.fetchVagas] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  createVaga: async (payload) => {
    console.log('[remuneradosAdminService.createVaga] Iniciando...', payload);
    try {
      const { data, error } = await supabase.from('vagas_remunerados').insert([payload]).select().single();
      if (error) throw error;
      console.log('[remuneradosAdminService.createVaga] Sucesso:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.createVaga] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  updateVaga: async (id, payload) => {
    console.log('[remuneradosAdminService.updateVaga] Iniciando...', id, payload);
    try {
      const { data, error } = await supabase.from('vagas_remunerados').update(payload).eq('id', id).select().single();
      if (error) throw error;
      console.log('[remuneradosAdminService.updateVaga] Sucesso:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.updateVaga] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  deleteVaga: async (id) => {
    console.log('[remuneradosAdminService.deleteVaga] Iniciando...', id);
    try {
      // Primeiro, busca a vaga para saber a data e tipo
      const { data: vaga, error: fetchError } = await supabase.from('vagas_remunerados').select('data, tipo').eq('id', id).single();
      if (fetchError) throw fetchError;

      // Verifica se há agendamentos vinculados à data/tipo desta vaga
      const { count, error: countError } = await supabase
        .from('agendamentos_remunerados')
        .select('*', { count: 'exact', head: true })
        .eq('data', vaga.data)
        .eq('tipo', vaga.tipo)
        .in('status', ['pendente', 'aprovado']);
        
      if (countError) throw countError;
      if (count && count > 0) throw new Error("Não é possível excluir: existem agendamentos ativos para esta data e turno.");
      
      const { error } = await supabase.from('vagas_remunerados').delete().eq('id', id);
      if (error) throw error;
      
      console.log('[remuneradosAdminService.deleteVaga] Sucesso.');
      return { success: true };
    } catch (error) {
      console.error('[remuneradosAdminService.deleteVaga] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  generateMonthlySchedule: async (year, month, rdCount, rnCount) => {
    console.log('[remuneradosAdminService.generateMonthlySchedule] Iniciando...', {year, month, rdCount, rnCount});
    try {
      const daysInMonth = new Date(year, month, 0).getDate();
      const vagas = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        // Dias úteis (1 a 5 = Seg a Sex)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const formattedDate = date.toISOString().split('T')[0];
          if (rdCount > 0) vagas.push({ data: formattedDate, tipo: 'RD', vagas_totais: rdCount, ativa: true, vagas_ocupadas: 0 });
          if (rnCount > 0) vagas.push({ data: formattedDate, tipo: 'RN', vagas_totais: rnCount, ativa: true, vagas_ocupadas: 0 });
        }
      }
      
      if (vagas.length === 0) return { success: true, data: [] };
      
      const { data, error } = await supabase.from('vagas_remunerados').upsert(vagas, { onConflict: 'data,tipo' }).select();
      if (error) throw error;
      
      console.log('[remuneradosAdminService.generateMonthlySchedule] Sucesso:', data?.length, 'vagas geradas');
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.generateMonthlySchedule] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  fetchPendingApprovals: async () => {
    try {
      const { data, error } = await supabase
        .from('vw_agendamentos_admin')
        .select('*')
        .eq('status', 'pendente')
        .order('data', { ascending: true });
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  fetchAllServicos: async () => {
    console.log('[remuneradosAdminService.fetchAllServicos] Iniciando...');
    try {
      const { data, error } = await supabase
        .from('vw_agendamentos_admin')
        .select('*')
        .order('data', { ascending: false });
        
      if (error) throw error;
      console.log('[remuneradosAdminService.fetchAllServicos] Sucesso:', data.length);
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.fetchAllServicos] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  updateApprovalStatus: async (id, status, observacao = '') => {
    console.log('[remuneradosAdminService.updateApprovalStatus] Iniciando...', {id, status, observacao});
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      let adminId = null;

      if (userId) {
        const { data: admin } = await supabase.from('servidores').select('id').eq('user_id', userId).maybeSingle();
        adminId = admin?.id;
      }

      const { data, error } = await supabase
        .from('agendamentos_remunerados')
        .update({ 
          status, 
          observacao,
          alterado_em: new Date().toISOString(),
          alterado_por: adminId,
          motivo_alteracao: `Status alterado para ${status}`
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      console.log('[remuneradosAdminService.updateApprovalStatus] Sucesso');
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.updateApprovalStatus] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  cancelarServico: async (id, motivo) => {
    console.log('[remuneradosAdminService.cancelarServico] Iniciando...', {id, motivo});
    return await remuneradosAdminService.updateApprovalStatus(id, 'cancelado', motivo);
  },

  reagendarServico: async (id, novaData, motivo) => {
    console.log('[remuneradosAdminService.reagendarServico] Iniciando...', {id, novaData, motivo});
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      let adminId = null;

      if (userId) {
        const { data: admin } = await supabase.from('servidores').select('id').eq('user_id', userId).maybeSingle();
        adminId = admin?.id;
      }

      const { data: atual, error: errAtual } = await supabase.from('agendamentos_remunerados').select('data_original, data').eq('id', id).single();
      if (errAtual) throw errAtual;

      const dataOriginal = atual.data_original || atual.data;

      const { data, error } = await supabase
        .from('agendamentos_remunerados')
        .update({ 
          status: 'reagendado', 
          data: novaData,
          data_original: dataOriginal,
          observacao: motivo,
          alterado_em: new Date().toISOString(),
          alterado_por: adminId,
          motivo_alteracao: `Reagendado de ${atual.data} para ${novaData}`
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      console.log('[remuneradosAdminService.reagendarServico] Sucesso');
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.reagendarServico] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  // --- BANCO DE HORAS ADMIN METHODS ---

  fetchSolicitacoesAdmin: async () => {
    console.log('[remuneradosAdminService.fetchSolicitacoesAdmin] Iniciando...');
    try {
      const { data, error } = await supabase
        .from('vw_solicitacoes_banco_horas_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[remuneradosAdminService.fetchSolicitacoesAdmin] Sucesso:', data.length);
      return { success: true, data };
    } catch (error) {
      console.error("[remuneradosAdminService.fetchSolicitacoesAdmin] Erro:", error);
      return { success: false, error: error.message };
    }
  },

  aprovarSolicitacaoHoras: async (id, servidorId, horas) => {
    console.log('[remuneradosAdminService.aprovarSolicitacaoHoras] Iniciando...', {id, servidorId, horas});
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: adminServidor } = await supabase
        .from('servidores')
        .select('id')
        .eq('user_id', session.session?.user?.id)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from('solicitacoes_banco_horas')
        .update({
          status: 'aprovado',
          aprovado_por: adminServidor?.id || null,
          aprovado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Movimentação de horas (crédito) agora é tratada por trigger nativa no Supabase 
      // ao ver status mudar para 'aprovado'.
      
      console.log('[remuneradosAdminService.aprovarSolicitacaoHoras] Sucesso');
      return { success: true };
    } catch (error) {
      console.error("[remuneradosAdminService.aprovarSolicitacaoHoras] Erro:", error);
      return { success: false, error: error.message };
    }
  },

  recusarSolicitacaoHoras: async (id, observacao = '') => {
    console.log('[remuneradosAdminService.recusarSolicitacaoHoras] Iniciando...', id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: adminServidor } = await supabase
        .from('servidores')
        .select('id')
        .eq('user_id', session.session?.user?.id)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from('solicitacoes_banco_horas')
        .update({
          status: 'recusado',
          aprovado_por: adminServidor?.id || null,
          aprovado_em: new Date().toISOString(),
          observacao: observacao
        })
        .eq('id', id);

      if (updateError) throw updateError;
      console.log('[remuneradosAdminService.recusarSolicitacaoHoras] Sucesso');
      return { success: true };
    } catch (error) {
      console.error("[remuneradosAdminService.recusarSolicitacaoHoras] Erro:", error);
      return { success: false, error: error.message };
    }
  },

  fetchRelatorioData: async (ano, mes) => {
    console.log('[remuneradosAdminService.fetchRelatorioData] Iniciando...', { ano, mes });
    try {
      const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const daysInMonth = new Date(ano, mes, 0).getDate();
      const endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      // Buscar todos os agendamentos aprovados do mês com dados do servidor
      const { data, error } = await supabase
        .from('agendamentos_remunerados')
        .select(`
          id,
          data,
          tipo,
          status,
          servidor_id,
          servidores!agendamentos_remunerados_servidor_id_fkey (
            id,
            nome,
            matricula,
            plantao
          )
        `)
        .in('status', ['aprovado', 'reagendado'])
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (error) throw error;

      console.log('[remuneradosAdminService.fetchRelatorioData] Sucesso:', data?.length, 'registros');
      return { success: true, data, daysInMonth };
    } catch (error) {
      console.error('[remuneradosAdminService.fetchRelatorioData] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  fetchServidores: async (search = '') => {
    console.log('[remuneradosAdminService.fetchServidores] Iniciando...', { search });
    try {
      let query = supabase.from('servidores').select('*, banco_horas(saldo)').order('nome');
      
      if (search) {
        query = query.or(`nome.ilike.%${search}%,matricula.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.fetchServidores] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  updateServidor: async (id, payload) => {
    console.log('[remuneradosAdminService.updateServidor] Iniciando...', { id, payload });
    try {
      const { data, error, status } = await supabase
        .from('servidores')
        .update(payload)
        .eq('id', id)
        .select();

      console.log('[remuneradosAdminService.updateServidor] Resultado:', { data, error, status });

      if (error) throw error;
      
      // Se data for vazio e não houver erro, a RLS barrou ou o ID não existe
      if (!data || data.length === 0) {
        console.warn('[remuneradosAdminService.updateServidor] Nenhuma linha foi atualizada. Verifique permissões RLS ou o ID.');
        return { success: false, error: 'Nenhuma linha atualizada (verifique permissões).' };
      }

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('[remuneradosAdminService.updateServidor] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  // --- LIMITES MENSAIS RD/RN ---

  fetchLimitesMes: async (anoMes) => {
    try {
      const { data, error } = await supabase
        .from('config_limites_remunerados')
        .select('*')
        .eq('ano_mes', anoMes)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data: data || { limite_rd: 5, limite_rn: 5 } };
    } catch (error) {
      console.error('[remuneradosAdminService.fetchLimitesMes] Erro:', error);
      return { success: false, error: error.message };
    }
  },

  upsertLimitesMes: async (anoMes, limiteRd, limiteRn, adminServidorId) => {
    try {
      const { data, error } = await supabase
        .from('config_limites_remunerados')
        .upsert({
          ano_mes: anoMes,
          limite_rd: limiteRd,
          limite_rn: limiteRn,
          updated_at: new Date().toISOString(),
          updated_by: adminServidorId || null
        }, { onConflict: 'ano_mes' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[remuneradosAdminService.upsertLimitesMes] Erro:', error);
      return { success: false, error: error.message };
    }
  }
};
