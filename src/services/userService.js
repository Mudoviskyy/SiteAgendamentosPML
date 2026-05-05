import { supabase } from '@/lib/supabase';

export const getUsuariosPendentes = async () => {
  const { data, error } = await supabase.from('perfis').select('*').eq('aprovado', false).eq('role', 'visitante');
  if (error) throw error;
  return data;
};

export const aprovarUsuario = async (userId) => {
  const { error } = await supabase.from('perfis').update({ aprovado: true }).eq('id', userId);
  return { success: !error, error: error?.message };
};

export const recusarUsuario = async (userId) => {
  const { error } = await supabase.from('perfis').delete().eq('id', userId);
  return { success: !error, error: error?.message };
};