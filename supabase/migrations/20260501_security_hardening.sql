-- 1. Recreate Views with security_invoker = on
-- This ensures views respect RLS policies of the underlying tables.

-- Drop existing views first (dependencies might require CASCADE)
DROP VIEW IF EXISTS view_vagas_disponiveis CASCADE;
DROP VIEW IF EXISTS vw_solicitacoes_banco_horas_admin CASCADE;
DROP VIEW IF EXISTS view_posicao_fila CASCADE;
DROP VIEW IF EXISTS vw_calendario_remunerados CASCADE;
DROP VIEW IF EXISTS vw_agendamentos_admin CASCADE;
DROP VIEW IF EXISTS view_controle_visitas_mensal CASCADE;
DROP VIEW IF EXISTS view_admin_calendario_visitantes_detalhado CASCADE;
DROP VIEW IF EXISTS view_carteirinhas_admin CASCADE;

-- view_admin_calendario_visitantes_detalhado
CREATE OR REPLACE VIEW public.view_admin_calendario_visitantes_detalhado
WITH (security_invoker = on) AS
 SELECT v.id AS vaga_id,
    v.data_visita,
    v.horario,
    v.galeria,
    v.tipo_visita,
    v.vagas_totais,
    count(a.id) FILTER (WHERE (a.status <> ALL (ARRAY['cancelado'::text, 'revogado'::text]))) AS vagas_ocupadas,
    count(a.id) FILTER (WHERE (a.status = 'pendente'::text)) AS pendentes,
    count(a.id) FILTER (WHERE (a.status = 'aprovado'::text)) AS aprovados,
    COALESCE(json_agg(json_build_object('agendamento_id', a.id, 'status', a.status, 'nome_preso', a.nome_preso, 'matricula_preso', a.matricula_preso, 'whatsapp', a.whatsapp, 'visitante1_nome', a.visitante1_nome, 'visitante2_nome', a.visitante2_nome, 'visitante3_nome', a.visitante3_nome)) FILTER (WHERE (a.id IS NOT NULL)), '[]'::json) AS agendamentos_detalhes
   FROM (vagas_configuracao v
     LEFT JOIN agendamentos a ON ((a.vaga_configuracao_id = v.id)))
  GROUP BY v.id, v.data_visita, v.horario, v.galeria, v.tipo_visita, v.vagas_totais;

-- view_carteirinhas_admin
CREATE OR REPLACE VIEW public.view_carteirinhas_admin
WITH (security_invoker = on) AS
 SELECT id,
    usuario_id,
    nome,
    cpf,
    parentesco,
    nome_apenado,
    matricula_preso,
    telefone,
    protocolo,
    status,
    status_admin,
    observacao_admin,
    created_at,
    updated_at,
    validade,
    motivo_cancelamento,
    data_emissao,
    notificacao_vencimento_enviada,
    data_notificacao_vencimento,
    cancelado_por,
    cancelado_em,
    documentos_limpados,
    documentos_limpados_em,
    tipo_identificacao,
    tipo_telefone,
    possui_carteirinha,
    menor_idade,
    nome_menor,
    data_nascimento_menor,
    cpf_menor,
    ip_address,
        CASE
            WHEN ((menor_idade = true) AND (status = 'pendente'::text)) THEN 0
            WHEN (status = 'pendente'::text) THEN 1
            WHEN (status = 'aprovado'::text) THEN 2
            WHEN (status = 'recusado'::text) THEN 3
            WHEN (status = 'cancelado'::text) THEN 4
            ELSE NULL::integer
        END AS prioridade
   FROM carteirinhas;

-- view_controle_visitas_mensal
CREATE OR REPLACE VIEW public.view_controle_visitas_mensal
WITH (security_invoker = on) AS
 SELECT a.matricula_preso,
    to_char((v.data_visita)::timestamp with time zone, 'YYYY_MM'::text) AS mes_ref,
    count(*) FILTER (WHERE ((v.tipo_visita = ANY (ARRAY['social_presencial'::text, 'social_video'::text])) AND (a.status = 'aprovado'::text))) AS sociais,
    count(*) FILTER (WHERE ((v.tipo_visita = 'intima'::text) AND (a.status = 'aprovado'::text))) AS intimas
   FROM (agendamentos a
     JOIN vagas_configuracao v ON ((v.id = a.vaga_configuracao_id)))
  GROUP BY a.matricula_preso, (to_char((v.data_visita)::timestamp with time zone, 'YYYY_MM'::text));

-- view_posicao_fila
CREATE OR REPLACE VIEW public.view_posicao_fila
WITH (security_invoker = on) AS
 SELECT id,
    vaga_configuracao_id,
    id_visitante,
    nome_preso,
    matricula_preso,
    created_at,
    row_number() OVER (PARTITION BY vaga_configuracao_id ORDER BY created_at) AS posicao
   FROM fila_espera f
  WHERE (status = 'ativo'::text);

-- view_vagas_disponiveis
CREATE OR REPLACE VIEW public.view_vagas_disponiveis
WITH (security_invoker = on) AS
 SELECT v.id,
    v.data_visita,
    v.galeria,
    v.tipo_visita,
    v.horario,
    v.vagas_totais,
    count(a.id) FILTER (WHERE (a.status = ANY (ARRAY['pendente'::text, 'aprovado'::text]))) AS vagas_ocupadas,
    (v.vagas_totais - count(a.id) FILTER (WHERE (a.status = ANY (ARRAY['pendente'::text, 'aprovado'::text])))) AS vagas_restantes
   FROM (vagas_configuracao v
     LEFT JOIN agendamentos a ON ((a.vaga_configuracao_id = v.id)))
  GROUP BY v.id;

-- vw_agendamentos_admin
CREATE OR REPLACE VIEW public.vw_agendamentos_admin
WITH (security_invoker = on) AS
 SELECT a.id,
    a.servidor_id,
    a.data,
    a.tipo,
    a.status,
    a.observacao,
    a.created_at,
    a.updated_at,
    a.data_original,
    a.alterado_em,
    a.alterado_por,
    a.motivo_alteracao,
    s.nome AS servidor_nome,
    s.matricula AS servidor_matricula,
    alt.nome AS alterado_por_nome,
    a.turno,
    s.plantao AS servidor_plantao
   FROM ((agendamentos_remunerados a
     LEFT JOIN servidores s ON ((s.id = a.servidor_id)))
     LEFT JOIN servidores alt ON ((alt.id = a.alterado_por)));

-- vw_calendario_remunerados
CREATE OR REPLACE VIEW public.vw_calendario_remunerados
WITH (security_invoker = on) AS
 SELECT v.data,
    v.tipo,
    v.vagas_totais,
    COALESCE(count(a.id) FILTER (WHERE (a.status = ANY (ARRAY['aprovado'::text, 'pendente'::text, 'reagendado'::text]))), (0)::bigint) AS vagas_ocupadas,
    COALESCE(json_agg(json_build_object('agendamento_id', a.id, 'servidor_id', s.id, 'servidor_nome', s.nome, 'matricula', s.matricula, 'status', a.status, 'turno', a.turno)) FILTER (WHERE ((a.id IS NOT NULL) AND (a.status = ANY (ARRAY['aprovado'::text, 'pendente'::text, 'reagendado'::text])))), '[]'::json) AS servidores
   FROM ((vagas_remunerados v
     LEFT JOIN agendamentos_remunerados a ON (((a.data = v.data) AND (a.tipo = v.tipo))))
     LEFT JOIN servidores s ON ((s.id = a.servidor_id)))
  GROUP BY v.data, v.tipo, v.vagas_totais;

-- vw_solicitacoes_banco_horas_admin
CREATE OR REPLACE VIEW public.vw_solicitacoes_banco_horas_admin
WITH (security_invoker = on) AS
 SELECT s.id,
    s.servidor_id,
    s.horas,
    s.tipo,
    s.status,
    s.motivo,
    s.created_at,
    s.aprovado_por,
    s.aprovado_em AS data_aprovacao,
    s.aprovado_em,
    srv.nome AS servidor_nome,
    srv.matricula AS servidor_matricula,
    srv.role AS servidor_role,
    apr.nome AS aprovado_por_nome,
    srv.plantao AS servidor_plantao
   FROM ((solicitacoes_banco_horas s
     LEFT JOIN servidores srv ON ((srv.id = s.servidor_id)))
     LEFT JOIN servidores apr ON ((apr.id = s.aprovado_por)));


-- 2. Enable RLS on public tables missing it
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_remunerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_remunerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_rd_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vagas_remunerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_horas ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS Policies for these tables (Admins/Servidores only)

-- banco_horas: Admin can do all, Servidor can view own
CREATE POLICY "Admin_full_access_banco_horas" ON public.banco_horas
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Servidor_view_own_banco_horas" ON public.banco_horas
    FOR SELECT TO authenticated
    USING (servidor_id IN (SELECT id FROM public.servidores WHERE user_id = (SELECT auth.uid())));

-- agendamentos_remunerados
CREATE POLICY "Admin_full_access_agendamentos_remunerados" ON public.agendamentos_remunerados
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Servidor_view_own_agendamentos_remunerados" ON public.agendamentos_remunerados
    FOR SELECT TO authenticated
    USING (servidor_id IN (SELECT id FROM public.servidores WHERE user_id = (SELECT auth.uid())));

-- configuracao_remunerados (Admin only)
CREATE POLICY "Admin_full_access_configuracao_remunerados" ON public.configuracao_remunerados
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

-- controle_rd_mensal
CREATE POLICY "Admin_full_access_controle_rd_mensal" ON public.controle_rd_mensal
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

-- vagas_remunerados
CREATE POLICY "Admin_full_access_vagas_remunerados" ON public.vagas_remunerados
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Anyone_view_vagas_remunerados" ON public.vagas_remunerados
    FOR SELECT TO authenticated
    USING (true);

-- movimentacao_horas
CREATE POLICY "Admin_full_access_movimentacao_horas" ON public.movimentacao_horas
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Servidor_view_own_movimentacao_horas" ON public.movimentacao_horas
    FOR SELECT TO authenticated
    USING (servidor_id IN (SELECT id FROM public.servidores WHERE user_id = (SELECT auth.uid())));

-- 4. Enable RLS on other reported tables if not already (safeguard)
ALTER TABLE public.agenda_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_limpeza_documentos ENABLE ROW LEVEL SECURITY;

-- Add basic admin policies for these if they don't have any
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_mensal') THEN
        CREATE POLICY "Admin_full_access_agenda_mensal" ON public.agenda_mensal FOR ALL TO authenticated USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'galerias') THEN
        CREATE POLICY "Anyone_view_galerias" ON public.galerias FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin_full_access_galerias" ON public.galerias FOR ALL TO authenticated USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'horarios') THEN
        CREATE POLICY "Anyone_view_horarios" ON public.horarios FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admin_full_access_horarios" ON public.horarios FOR ALL TO authenticated USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'log_limpeza_documentos') THEN
        CREATE POLICY "Admin_full_access_log_limpeza" ON public.log_limpeza_documentos FOR ALL TO authenticated USING ((SELECT role FROM public.servidores WHERE user_id = (SELECT auth.uid())) = 'admin');
    END IF;
END $$;
