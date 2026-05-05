import { useState, useCallback } from 'react';
import * as userService from '@/services/userService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

export const useUsers = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetchPendentes = useCallback(async (page = 0, limit = 10) => {
    setLoading(true);
    setError(null);

    const from = page * limit;
    const to = from + limit - 1;

    const { data, error: fetchError, count } = await supabase
      .from('perfis')
      .select('*', { count: 'exact' })
      .eq('aprovado', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setUsuarios(data || []);
      setTotal(count || 0);
    }

    setLoading(false);
  }, []);

  const aprovarUsuario = async (id) => {
    const previousUsers = [...usuarios];
    setUsuarios(prev => prev.filter(user => user.id !== id));

    const { success, error: apiError } = await userService.aprovarUsuario(id);

    if (success) {
      toast({
        title: "Usuário aprovado",
        description: "O acesso foi liberado com sucesso.",
        className: "bg-green-600 text-white border-none",
      });
    } else {
      setUsuarios(previousUsers);
      toast({
        title: "Erro ao aprovar",
        description: apiError || "Não foi possível aprovar o usuário.",
        variant: "destructive",
      });
    }
  };

  const recusarUsuario = async (id) => {
    const previousUsers = [...usuarios];
    setUsuarios(prev => prev.filter(user => user.id !== id));

    const { success, error: apiError } = await userService.recusarUsuario(id);

    if (success) {
      toast({
        title: "Solicitação recusada",
        description: "O cadastro foi removido com sucesso.",
      });
    } else {
      setUsuarios(previousUsers);
      toast({
        title: "Erro ao recusar",
        description: apiError || "Não foi possível recusar o usuário.",
        variant: "destructive",
      });
    }
  };

  return {
    usuarios,
    loading,
    error,
    fetchPendentes,
    aprovarUsuario,
    recusarUsuario,
    total
  };
};