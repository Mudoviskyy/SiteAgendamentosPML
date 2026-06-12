-- Migration: Fix Agendamento Race Condition & RLS Policies
-- Date: 2026-06-01
-- Author: Antigravity

-- 1. Drop the legacy / ambiguous duplicate function which caused compilation/routing issues
DROP FUNCTION IF EXISTS public.criar_agendamento(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text);

-- 2. Redefine the active function with SECURITY DEFINER
-- This is essential so that the SELECT ... FOR UPDATE lock on public.vagas_configuracao
-- is executed with postgres privileges and is not filtered out by RLS policies (which visitors cannot UPDATE).
CREATE OR REPLACE FUNCTION public.criar_agendamento(
  p_id_visitante uuid,
  p_nome_preso text,
  p_matricula_preso text,
  p_visitante1_nome text,
  p_visitante1_carteirinha text,
  p_visitante2_nome text,
  p_visitante2_carteirinha text,
  p_visitante3_nome text,
  p_visitante3_carteirinha text,
  p_whatsapp text,
  p_email text,
  p_vaga_configuracao_id uuid,
  p_ip_address text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo_visita text;
  v_data_visita date;
  v_vagas_total integer;
  v_vagas_ocupadas integer;
  v_novo_id uuid;
  v_validade_carteirinha date;
BEGIN
  -- 1. Buscar dados da vaga primeiro para ter a data_visita
  SELECT tipo_visita, data_visita, vagas_totais
  INTO v_tipo_visita, v_data_visita, v_vagas_total
  FROM public.vagas_configuracao
  WHERE id = p_vaga_configuracao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vaga não encontrada.';
  END IF;

  -- 🔒 BLOQUEIO: Verifica se existe carteirinha aprovada válida NA DATA DA VISITA
  -- Ignoramos carteirinhas de menores/vínculos para esta verificação master
  SELECT MAX(validade)::date INTO v_validade_carteirinha
  FROM public.carteirinhas
  WHERE usuario_id = p_id_visitante
    AND status = 'aprovado'
    AND menor_idade = false
    AND protocolo NOT LIKE 'VIN-%'
    AND protocolo NOT LIKE 'MEN-%';

  IF v_validade_carteirinha IS NULL THEN
    RAISE EXCEPTION 'Você não possui uma carteirinha aprovada ativa em nosso sistema.';
  END IF;

  -- Se a validade for anterior à data da visita, bloqueia
  IF v_validade_carteirinha < v_data_visita THEN
    RAISE EXCEPTION 'Sua carteirinha vencerá em % e não é válida para a data da visita selecionada (%). Por favor, renove sua carteirinha primeiro.', 
      to_char(v_validade_carteirinha, 'DD/MM/YYYY'), 
      to_char(v_data_visita, 'DD/MM/YYYY');
  END IF;

  -- 🔐 Lock da vaga para evitar race condition
  PERFORM 1 FROM public.vagas_configuracao
  WHERE id = p_vaga_configuracao_id
  FOR UPDATE;

  -- Contagem de ocupação real
  SELECT COUNT(*) INTO v_vagas_ocupadas
  FROM public.agendamentos
  WHERE vaga_configuracao_id = p_vaga_configuracao_id
    AND status NOT IN ('cancelado','revogado');

  -- 🔁 Se vaga cheia → Retorna Erro
  IF v_vagas_ocupadas >= v_vagas_total THEN
    RAISE EXCEPTION 'VAGA_ESGOTADA';
  END IF;

  -- ✅ Insere agendamento
  INSERT INTO public.agendamentos(
    id_visitante,
    nome_preso,
    matricula_preso,
    visitante1_nome,
    visitante1_carteirinha,
    visitante2_nome,
    visitante2_carteirinha,
    visitante3_nome,
    visitante3_carteirinha,
    whatsapp,
    email,
    vaga_configuracao_id,
    ip_address,
    status
  )
  VALUES(
    p_id_visitante,
    p_nome_preso,
    p_matricula_preso,
    p_visitante1_nome,
    p_visitante1_carteirinha,
    p_visitante2_nome,
    p_visitante2_carteirinha,
    p_visitante3_nome,
    p_visitante3_carteirinha,
    p_whatsapp,
    p_email,
    p_vaga_configuracao_id,
    p_ip_address,
    'pendente'
  )
  RETURNING id INTO v_novo_id;

  RETURN json_build_object('sucesso', true, 'id', v_novo_id);
END;
$$;

-- 3. Drop all policies that allowed visitors to perform direct INSERTS into the agendamentos table.
-- All inserts must now go through the secure RPC function.
DROP POLICY IF EXISTS "Visitante pode inserir seus agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamento_somente_com_carteirinha" ON public.agendamentos;
