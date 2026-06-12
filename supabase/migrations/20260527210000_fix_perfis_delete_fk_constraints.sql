-- Migration: Corrigir restrições de chave estrangeira para permitir exclusão de perfis (LGPD)
-- Criada em: 2026-05-27

-- Alteração da restrição analisado_por na tabela agendamentos
ALTER TABLE public.agendamentos 
  DROP CONSTRAINT IF EXISTS agendamentos_analisado_por_fkey,
  ADD CONSTRAINT agendamentos_analisado_por_fkey 
  FOREIGN KEY (analisado_por) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- Alteração da restrição analisado_por na tabela carteirinhas
ALTER TABLE public.carteirinhas 
  DROP CONSTRAINT IF EXISTS carteirinhas_analisado_por_fkey,
  ADD CONSTRAINT carteirinhas_analisado_por_fkey 
  FOREIGN KEY (analisado_por) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- Alteração da restrição aprovado_por na tabela uso_horas
ALTER TABLE public.uso_horas 
  DROP CONSTRAINT IF EXISTS uso_horas_aprovado_por_fkey,
  ADD CONSTRAINT uso_horas_aprovado_por_fkey 
  FOREIGN KEY (aprovado_por) REFERENCES public.perfis(id) ON DELETE SET NULL;

-- Permitir que id_visitante em agendamentos seja nulo após a exclusão do perfil (ON DELETE SET NULL)
ALTER TABLE public.agendamentos 
  ALTER COLUMN id_visitante DROP NOT NULL;

