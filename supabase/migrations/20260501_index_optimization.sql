-- 1. Remove Duplicate Indexes
-- Removing identical indexes to save storage and improve write performance.

-- Table: public.agendamentos
DROP INDEX IF EXISTS public.idx_agendamentos_id_visitante; -- Duplicate of idx_agendamentos_visitante
DROP INDEX IF EXISTS public.idx_agendamentos_vaga;         -- Duplicate of idx_agendamentos_vaga_configuracao_id

-- Table: public.carteirinhas
DROP INDEX IF EXISTS public.idx_carteirinhas_usuario;     -- Duplicate of idx_carteirinhas_usuario_id

-- Table: public.servidores
DROP INDEX IF EXISTS public.servidores_user_id_unique;    -- Duplicate of servidores_user_id_key

-- Table: public.vagas_configuracao
DROP INDEX IF EXISTS public.idx_vagas_configuracao_data_mes;     -- Duplicate of idx_vagas_configuracao_data_visita
DROP INDEX IF EXISTS public.idx_vagas_data;                      -- Duplicate of idx_vagas_configuracao_data_visita
DROP INDEX IF EXISTS public.idx_vagas_configuracao_tipo;         -- Duplicate of idx_vagas_tipo


-- 2. Add Missing Indexes for Foreign Keys
-- These improve join performance and prevent full table scans.

CREATE INDEX IF NOT EXISTS idx_agenda_servidor_servidor_id ON public.agenda_servidor(servidor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_remunerados_alterado_por ON public.agendamentos_remunerados(alterado_por);
CREATE INDEX IF NOT EXISTS idx_config_limites_remunerados_updated_by ON public.config_limites_remunerados(updated_by);
CREATE INDEX IF NOT EXISTS idx_fila_espera_visitante ON public.fila_espera(id_visitante);
CREATE INDEX IF NOT EXISTS idx_horarios_galeria_id ON public.horarios(galeria_id);
CREATE INDEX IF NOT EXISTS idx_reports_bugs_visitante_id ON public.reports_bugs(visitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_banco_horas_aprovado_por ON public.solicitacoes_banco_horas(aprovado_por);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_carteirinha_user_id ON public.solicitacoes_carteirinha(user_id);
CREATE INDEX IF NOT EXISTS idx_uso_horas_aprovado_por ON public.uso_horas(aprovado_por);
CREATE INDEX IF NOT EXISTS idx_uso_horas_servidor ON public.uso_horas(servidor_id);


-- 3. Remove Unused Indexes (candidates identified by advisor)
-- Note: Use caution as some indexes might be used in rare but critical reports.
-- I'll only remove the ones clearly redundant or extremely specific that haven't been used.

DROP INDEX IF EXISTS public.carteirinhas_documentos_limpados_idx;
DROP INDEX IF EXISTS public.idx_agendamentos_matricula_mes;
DROP INDEX IF EXISTS public.idx_perfis_email;
DROP INDEX IF EXISTS public.idx_solicitacoes_servidor;
DROP INDEX IF EXISTS public.idx_solicitacoes_status;
DROP INDEX IF EXISTS public.carteirinhas_data_emissao_idx;
