import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useVagas = () => {

  const [vagas, setVagas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchVagas = useCallback(async ({
  page = 0,
  pageSize = 10,
  tipo = 'todos',
  data = ''
  } = {}) => {
    setLoading(true);
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('view_admin_vagas')
        .select('*', { count: 'exact' })
        .order('data_visita', { ascending: false })
        .order('horario', { ascending: true }); // Ordenação secundária por hora

      if (tipo !== 'todos') {
        query = query.eq('tipo_visita', tipo);
      }

      // NOVA LÓGICA DE FILTRO DE DATA
      if (data) {
        query = query.eq('data_visita', data);
      }

      query = query.range(from, to);
      const { data: result, count, error } = await query;
      if (error) throw error;

      setVagas(result || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Erro ao buscar vagas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createVaga = async (vagaData) => {
    try {
      const { error } = await supabase
        .from('vagas_configuracao')
        .insert([vagaData]);

      if (error) throw error;

      await fetchVagas();
      return true;

    } catch (error) {
      console.error('Erro ao criar vaga:', error);
      return false;
    }
  };

  const updateVaga = async (id, vagaData) => {
    try {

      const { error } = await supabase
        .from('vagas_configuracao')
        .update(vagaData)
        .eq('id', id);

      if (error) throw error;

      await fetchVagas();
      return true;

    } catch (error) {
      console.error('Erro ao atualizar vaga:', error);
      return false;
    }
  };

  const deleteVaga = async (id) => {
    try {

      const { error } = await supabase
        .from('vagas_configuracao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchVagas();
      return true;

    } catch (error) {
      console.error('Erro ao deletar vaga:', error);
      return false;
    }
  };

  return {
    vagas,
    loading,
    total,
    fetchVagas,
    createVaga,
    updateVaga,
    deleteVaga
  };
};