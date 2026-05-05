
import { supabase } from '@/lib/supabase';

export const getVagasDisponiveis = async ({ tipo, galeria }) => {
  const { data, error } = await supabase
    .from('view_vagas_disponiveis')
    .select('*')
    .eq('tipo_visita', tipo)
    .eq('galeria', galeria)
    .gt('vagas_restantes', 0)
    .order('data_visita', { ascending: true })
    .order('horario', { ascending: true });

  if (error) throw error;
  return data;
};

export const unblockDateRange = async (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error('Data de início e fim são obrigatórias.');
  }

  if (new Date(endDate) < new Date(startDate)) {
    throw new Error('A data de fim não pode ser menor que a data de início.');
  }

  const { data, error } = await supabase
    .from('bloqueios_agendamento')
    .delete()
    .gte('data_visita', startDate)
    .lte('data_visita', endDate);

  if (error) throw error;
  return data;
};
