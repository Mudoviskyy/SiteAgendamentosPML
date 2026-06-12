-- Migration: Fix view_controle_visitas_mensal security mode
-- Date: 2026-06-02
-- Author: Antigravity
--
-- ROOT CAUSE:
--   view_controle_visitas_mensal was created with `security_invoker = on`.
--   This means the view runs under the CALLER's RLS context, not the owner's.
--   The RLS SELECT policy on `agendamentos` is:
--     "Visitante pode ver seus agendamentos" → (auth.uid() = id_visitante)
--   So when a visitor queries the view, it only counts THEIR OWN bookings.
--   If another visitor (e.g. Visitor B) also has an approved booking for the same
--   prisoner (Prisoner X), Visitor A's query will NOT count Visitor B's booking.
--   This caused the monthly social count to appear as 1 instead of 2.
--
-- THE FIX:
--   Recreate the view WITHOUT `security_invoker = on` (default = SECURITY DEFINER).
--   The view now runs as the owner and bypasses RLS, so it counts ALL approved
--   bookings for a prisoner — regardless of which visitor created them.
--   This is safe because the view only exposes aggregate counts, not personal data.

CREATE OR REPLACE VIEW public.view_controle_visitas_mensal AS
 SELECT a.matricula_preso,
    to_char((v.data_visita)::timestamp with time zone, 'YYYY_MM'::text) AS mes_ref,
    count(*) FILTER (WHERE ((v.tipo_visita = ANY (ARRAY['social_presencial'::text, 'social_video'::text])) AND (a.status = 'aprovado'::text))) AS sociais,
    count(*) FILTER (WHERE ((v.tipo_visita = 'intima'::text) AND (a.status = 'aprovado'::text))) AS intimas
   FROM (agendamentos a
     JOIN vagas_configuracao v ON ((v.id = a.vaga_configuracao_id)))
  GROUP BY a.matricula_preso, (to_char((v.data_visita)::timestamp with time zone, 'YYYY_MM'::text));
