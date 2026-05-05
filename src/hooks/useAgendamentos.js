import { useState, useCallback } from 'react'; 
import * as service from '@/services/agendamentosService';
import { supabase } from '@/lib/supabase';



export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const fetchUserAgendamentos = useCallback(async (userId) => {
    setLoading(true); try {
      const data = await service.getAgendamentosByUser(userId); setAgendamentos(data);

    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, []);

  const fetchAllAgendamentos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          vagas_configuracao (
            data_visita,
            horario,
            galeria,
            tipo_visita
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgendamentos(
      (data || []).map(a => ({
        ...a,
        data_visita: a.vagas_configuracao?.data_visita,
        horario: a.vagas_configuracao?.horario,
        galeria: a.vagas_configuracao?.galeria,
        tipo_visita: a.vagas_configuracao?.tipo_visita
      }))
    );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const create = async (data) => {
    setLoading(true);
    try {
      const result = await service.createAgendamento(data);
      setAgendamentos(prev => [result, ...prev]);
      return result;

    } catch (err) {

      if (err.message?.includes("new row violates row-level security policy")) {
        setError("Sua carteirinha precisa estar aprovada para agendar visitas.");
      } else {
        setError(err.message);
      }

      throw err;

    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const previousAgendamentos = [...agendamentos];
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));

    try {
      const updated = await service.updateAgendamentoStatus(id, status);
      await fetchAllAgendamentos();
      setAgendamentos(prev => prev.map(a => a.id === id ? updated : a));
    } catch (err) {
      console.error("Failed to update status, reverting:", err);
      setAgendamentos(previousAgendamentos); setError(err.message);
      throw err;
    }
  };
  return { agendamentos, loading, error, fetchUserAgendamentos, fetchAllAgendamentos, create, updateStatus };
};