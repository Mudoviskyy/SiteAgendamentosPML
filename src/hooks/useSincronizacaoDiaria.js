import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook que verifica se a sincronização diária de relatórios já foi feita hoje.
 * Retorna:
 *   - sincronizado: boolean (true = já sincronizado hoje, não exibir modal)
 *   - loading: boolean
 *   - marcarConcluido: função para registrar a conclusão no banco
 */
export const useSincronizacaoDiaria = () => {
  const [sincronizado, setSincronizado] = useState(null); // null = ainda verificando
  const [loading, setLoading] = useState(true);

  const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  useEffect(() => {
    const verificar = async () => {
      try {
        const { data, error } = await supabase
          .from('sincronizacao_diaria')
          .select('id')
          .eq('data_ref', hoje)
          .maybeSingle();

        if (error) throw error;
        setSincronizado(!!data);
      } catch (err) {
        console.error('[useSincronizacaoDiaria] Erro ao verificar:', err);
        // Em caso de erro, não bloqueia o admin
        setSincronizado(true);
      } finally {
        setLoading(false);
      }
    };

    verificar();
  }, [hoje]);

  const marcarConcluido = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome')
        .eq('id', user?.id)
        .maybeSingle();

      await supabase.from('sincronizacao_diaria').upsert({
        data_ref: hoje,
        admin_id: user?.id,
        admin_nome: perfil?.nome || user?.email || 'Admin',
        concluido_em: new Date().toISOString(),
      }, { onConflict: 'data_ref' });

      setSincronizado(true);
    } catch (err) {
      console.error('[useSincronizacaoDiaria] Erro ao marcar:', err);
    }
  };

  return { sincronizado, loading, marcarConcluido };
};
