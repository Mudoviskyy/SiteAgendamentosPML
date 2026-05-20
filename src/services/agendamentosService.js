
import { supabase } from '@/lib/supabase';

export const verificarCarteirinhaStatus = async (userId) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('carteirinhas')
    .select('status, validade, data_emissao, created_at, protocolo')
    .eq('usuario_id', userId)
    .eq('status', 'aprovado')
    .eq('menor_idade', false)
    .not('protocolo', 'like', 'VIN-%')
    .not('protocolo', 'like', 'MEN-%')
    .not('protocolo', 'like', 'PAR-%')
    .order('validade', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data || !data.validade) {
    return {
      ativa: false,
      vencida: false,
      diasRestantes: 0,
      podeRenovar: true,
      validade: null,
      dataEmissao: null
    };
  }

  const validade = new Date(data.validade);
  validade.setHours(0, 0, 0, 0);

  if (isNaN(validade)) {
    throw new Error('Data de validade inválida no banco.');
  }

  const diffMs = validade - hoje;
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const ativa = diasRestantes > 0;
  const vencida = diasRestantes <= 0;

  const podeRenovar = !ativa || diasRestantes <= 30;

  return {
    status: data.status,
    ativa,
    vencida,
    diasRestantes: ativa ? diasRestantes : 0,
    podeRenovar,
    validade: data.validade,
    dataEmissao: data.data_emissao || data.created_at,
  };
};

export const cancelarAgendamentoVisitante = async (agendamentoId, visitanteId) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .update({
      status: 'cancelado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agendamentoId)
    .eq('id_visitante', visitanteId)
    .in('status', ['pendente', 'aprovado'])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const desfazerCancelamentoAgendamento = async (agendamentoId) => {
  const { data: agendamento, error: getError } = await supabase
    .from('agendamentos')
    .select('vaga_configuracao_id')
    .eq('id', agendamentoId)
    .single();
    
  if (getError) throw getError;
  
  const { data: vaga, error: vagaError } = await supabase
    .from('view_vagas_disponiveis')
    .select('vagas_restantes')
    .eq('id', agendamento.vaga_configuracao_id)
    .maybeSingle();

  if (vagaError) throw vagaError;

  if (!vaga || vaga.vagas_restantes <= 0) {
    throw new Error('Não há vagas disponíveis para reativar este agendamento.');
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .update({ 
      status: 'pendente',
      motivo_recusa: null
    })
    .eq('id', agendamentoId)
    .select();

  if (error) throw error;
  return data[0];
};

export const getVagasConfiguracaoOptions = async () => {
  const { data, error } = await supabase
    .from('vagas_configuracao')
    .select('tipo_visita, galeria')
    .gte('data_visita', new Date().toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching options:', error);
    throw error;
  }

  const tipos = [...new Set(data.map(item => item.tipo_visita))];
  const galerias = [...new Set(data.map(item => item.galeria))].sort();

  return { tipos, galerias };
};

export const getAvailableDates = async (tipo_visita, galeria) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Utilizamos a view_vagas_disponiveis que já calcula a ocupação real
  const { data, error } = await supabase
    .from('view_vagas_disponiveis')
    .select('data_visita')
    .eq('tipo_visita', tipo_visita)
    .eq('galeria', galeria)
    .gte('data_visita', today)
    .gt('vagas_restantes', 0)
    .order('data_visita', { ascending: true });

  if (error) {
    console.error('Error fetching dates:', error);
    throw error;
  }

  // Retornamos apenas os valores únicos de data_visita
  return [...new Set(data.map(item => item.data_visita))];
};

export const getAvailableHorarios = async (data_visita, tipo_visita, galeria) => {
  const { data, error } = await supabase
    .from('view_vagas_disponiveis')
    .select(`
      id,
      horario,
      vagas_totais,
      vagas_ocupadas,
      vagas_restantes
    `)
    .eq('data_visita', data_visita)
    .eq('tipo_visita', tipo_visita)
    .eq('galeria', galeria)
    .gt('vagas_restantes', 0)
    .order('horario', { ascending: true });

  if (error) throw error

  return data.map(slot => ({
    ...slot,
    disponivel: true, // Já vem filtrado da view
    vaga_configuracao_id: slot.id
  }));
}

export const createAgendamento = async (agendamentoData) => {
  // Captura o IP global se disponível
  const payload = {
    ...agendamentoData,
    p_ip_address: window.USER_IP || null
  };

  const { data, error } = await supabase.rpc(
    'criar_agendamento',
    payload
  )

  if (error) throw error

  // Se teve sucesso, salva os metadados de segurança para monitoramento anti-fraude
  if (data && data.sucesso) {
    try {
      const { data: recent } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('id_visitante', payload.p_id_visitante)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recent && recent.id) {
        await supabase.rpc('registrar_seguranca_agendamento', {
          p_agendamento_id: recent.id,
          p_ip: window.USER_IP || null,
          p_ua: window.USER_AGENT || navigator.userAgent || null
        });
      }
    } catch (secError) {
      console.error('Erro ao registrar segurança:', secError);
    }
  }

  return data
}

export const criarAgendamento = createAgendamento;

export const getDashboardAgendamentos = async (userId) => {
  const { data, error } = await supabase
    .from('view_dashboard_visitante')
    .select('*')
    .eq('id_visitante', userId)
    .order('data_visita', { ascending: false })

  if (error) throw error
  return data
}

export const getFilaPosition = async (userId) => {
  const { data, error } = await supabase
    .from('view_posicao_fila')
    .select('posicao, nome_preso')
    .eq('id_visitante', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const getMinhasFilas = async (userId) => {
  const { data, error } = await supabase
    .from('fila_espera')
    .select(`
      id,
      nome_preso,
      matricula_preso,
      status,
      created_at,
      vagas_configuracao (data_visita, horario, galeria, tipo_visita)
    `)
    .eq('id_visitante', userId)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Para cada fila_espera vamos pegar a sua posição na view_posicao_fila
  const filasComPosicao = await Promise.all(
    data.map(async (fila) => {
      const { data: posData } = await supabase
        .from('view_posicao_fila')
        .select('posicao')
        .eq('id', fila.id)
        .maybeSingle();
      
      return {
        ...fila,
        posicao: posData?.posicao || null
      };
    })
  );

  return filasComPosicao;
};

export const cancelarFila = async (filaId, userId) => {
  const { data, error } = await supabase
    .from('fila_espera')
    .update({ status: 'cancelado' })
    .eq('id', filaId)
    .eq('id_visitante', userId)
    .eq('status', 'ativo')
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAgendamentosByAdmin = async () => {
    const { data, error } = await supabase
      .from('view_exportacao_administrativa')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export const updateAgendamentoStatus = async (id, status) => {
    const { data, error } = await supabase.from('agendamentos').update({ status }).eq('id', id).select();
    if(error) throw error;
    return data[0];
}

export const getAgendamentosByUser = async (userId) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      id, status, nome_preso, matricula_preso, motivo_recusa,
      visitante1_nome, visitante2_nome, visitante3_nome,
      vagas_configuracao (data_visita, horario, galeria, tipo_visita)
    `)
    .eq('id_visitante', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map(a => ({
    id: a.id,
    status: a.status,
    nome_preso: a.nome_preso,
    matricula_preso: a.matricula_preso,
    motivo_recusa: a.motivo_recusa,
    visitante1_nome: a.visitante1_nome,
    visitante2_nome: a.visitante2_nome,
    visitante3_nome: a.visitante3_nome,
    data_visita: a.vagas_configuracao?.data_visita,
    horario: a.vagas_configuracao?.horario,
    galeria: a.vagas_configuracao?.galeria,
    tipo_visita: a.vagas_configuracao?.tipo_visita
  }));
};

export const fetchCalendarioAdminVisitantes = async (mes, ano, galeria, tipoVisita) => {
  const start = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
  const end = new Date(ano, mes, 0).toISOString().split('T')[0];

  let query = supabase
    .from('view_admin_calendario_visitantes_detalhado')
    .select('*')
    .gte('data_visita', start)
    .lte('data_visita', end);

  if (galeria !== 'all') query = query.eq('galeria', galeria);
  if (tipoVisita !== 'all') query = query.eq('tipo_visita', tipoVisita);

  const { data, error } = await query
    .order('data_visita')
    .order('horario');

  if (error) throw error;

  return data;
};

export const fetchResumoOcupacaoVisitantesUltimos6Meses = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const start6M = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('view_admin_calendario_visitantes')
    .select('data_visita, vagas_totais, vagas_ocupadas')
    .gte('data_visita', start6M);

  if (error) throw error;
  return data;
};

export const fetchTaxaOcupacaoAtualVisitantes = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('view_admin_calendario_visitantes')
    .select('vagas_totais, vagas_ocupadas')
    .gte('data_visita', monthStart)
    .lte('data_visita', monthEnd);

  if (error) throw error;

  if (!data || data.length === 0) return 0;

  const totais = data.reduce((acc, curr) => acc + (curr.vagas_totais || 0), 0);
  const ocupadas = data.reduce((acc, curr) => acc + (curr.vagas_ocupadas || 0), 0);

  if (totais === 0) return 0;
  return Math.round((ocupadas / totais) * 100);
};

export const getFaltasVisitanteMes = async (visitanteId, visitanteNome) => {
  if (!visitanteId || !visitanteNome) return 0;

  const hoje = new Date();
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(hoje.getMonth() - 3);
  
  const inicioBusca = tresMesesAtras.toISOString().split('T')[0];
  const hojeStr = hoje.toISOString().split('T')[0];

  // 1. Buscar agendamentos aprovados deste visitante nos últimos 3 meses, anteriores a hoje
  const { data: agendamentos, error: errA } = await supabase
    .from('agendamentos')
    .select('id, matricula_preso, vagas_configuracao!inner(data_visita)')
    .eq('id_visitante', visitanteId)
    .eq('status', 'aprovado')
    .gte('vagas_configuracao.data_visita', inicioBusca)
    .lt('vagas_configuracao.data_visita', hojeStr);

  if (errA || !agendamentos || agendamentos.length === 0) return 0;

  // 2. Normalizar nome do visitante e buscar visitas realizadas neste período
  const nomeNorm = String(visitanteNome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  
  const { data: visitas, error: errV } = await supabase
    .from('visitas_realizadas')
    .select('data_visita, matricula_detento')
    .eq('nome_visitante_normalizado', nomeNorm)
    .gte('data_visita', inicioBusca)
    .lt('data_visita', hojeStr);

  if (errV) return 0;
  
  // 3. Contar faltas: agendamentos aprovados que não têm correspondência na base de visitas realizadas
  let faltas = 0;
  agendamentos.forEach(ag => {
    const dataVisita = ag.vagas_configuracao.data_visita;
    const matricula = ag.matricula_preso;
    const visitou = visitas?.find(v => v.data_visita === dataVisita && v.matricula_detento === matricula);
    if (!visitou) {
      faltas++;
    }
  });

  return faltas;
};
