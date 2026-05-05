import { supabase } from '@/lib/supabase';

export const saveSolicitacaoEstudo = async (data) => {
  const { error } = await supabase.from('solicitacoes_estudo').insert([data]);
  return { success: !error, error: error?.message };
};