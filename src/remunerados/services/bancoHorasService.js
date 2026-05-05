import { supabase } from '@/lib/supabase';

export const bancoHorasService = {
  getBancoHoras: async (servidor_id) => {
    try {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('*')
        .eq('servidor_id', servidor_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; // ignore not found
      return {
        success: true,
        data: data || { saldo: 0, horas: 0 }
      };
    } catch (error) {
      console.error('Erro getBancoHoras:', error);
      return { success: false, error: error.message };
    }
  },

  getMovimentacoes: async (servidor_id) => {
    try {
      const { data, error } = await supabase
        .from('movimentacao_horas')
        .select('*')
        .eq('servidor_id', servidor_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro getMovimentacoes:', error);
      return { success: false, error: error.message };
    }
  },

  adicionarMovimentacao: async (servidor_id, tipo, horas, motivo, origem) => {
    try {
      const { data, error } = await supabase
        .from('movimentacao_horas')
        .insert([{
          servidor_id,
          tipo,
          horas,
          motivo,
          origem
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro adicionarMovimentacao:', error);
      return { success: false, error: error.message };
    }
  }
};