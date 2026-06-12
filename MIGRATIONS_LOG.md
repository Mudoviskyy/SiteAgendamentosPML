
# Migrations Log

## Fix view_controle_visitas_mensal — Security Invoker Bug

**Date:** June 2026

### Root Cause
`view_controle_visitas_mensal` was created with `security_invoker = on`, causing it to run under the **caller's** RLS context instead of the owner's. The RLS SELECT policy on `agendamentos` (`auth.uid() = id_visitante`) meant that when a visitor queried the view, only their **own** bookings were counted — not bookings made by other visitors for the same prisoner. This caused the monthly social count to display `1/3` instead of `2/3` when two different visitors had both made approved bookings for the same prisoner (matricula X) in June 2026.

### Fix
- [20260602000000_fix_view_controle_visitas_mensal_security.sql](file:///d:/Ciência%20da%20computação/Projetos%20diversos/Site%20PML/Versão%20Oficial%20em%20produção/supabase/migrations/20260602000000_fix_view_controle_visitas_mensal_security.sql)
  - Recreated `view_controle_visitas_mensal` **without** `security_invoker = on` (defaults to SECURITY DEFINER). The view now runs as the owner (`postgres`) and sees **all** approved bookings for every prisoner, regardless of which visitor created them. This is safe because the view only exposes aggregate counts (`matricula_preso`, `mes_ref`, `sociais`, `intimas`) — no personal visitor data.

---

## Race Condition & Direct Insert Hardening on Agendamentos

**Date:** June 2026

### 1. SQL Migrations Executed
- [20260601215000_fix_agendamento_race_condition_and_rls.sql](file:///d:/Ci%C3%AAncia%20da%20computa%C3%A7%C3%A3o/Projetos%20diversos/Site%20PML/Vers%C3%A3o%20Oficial%20em%20produ%C3%A7%C3%A3o/supabase/migrations/20260601215000_fix_agendamento_race_condition_and_rls.sql)
  - Dropped legacy ambiguous `criar_agendamento` function to resolve PostgREST RPC routing conflicts.
  - Redefined the active `criar_agendamento` function as `SECURITY DEFINER` so the `FOR UPDATE` lock executes with superuser/admin privileges, bypassing the RLS filter that previously caused it to return 0 rows for non-admin visitors.
  - Dropped direct `INSERT` policies (`Visitante pode inserir seus agendamentos` and `agendamento_somente_com_carteirinha`) on the `agendamentos` table. This enforces that all booking creations are channeled through the secure `criar_agendamento` RPC, preventing visitors from bypassing concurrency limits or fuso normalization via direct REST client queries.

## Foreign Document & International Phone Support

**Date:** April 2026

### 1. SQL Migrations Executed
