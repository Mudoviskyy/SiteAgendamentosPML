-- =============================================================
-- RPC: verificar_matricula_ipen
-- Permite que visitantes autenticados verifiquem se uma matrícula
-- existe na base_pdf e retornam o nome padronizado do interno,
-- sem expor os demais dados da tabela (SECURITY DEFINER).
-- =============================================================

CREATE OR REPLACE FUNCTION public.verificar_matricula_ipen(p_matricula text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_result jsonb;
BEGIN
  -- Só permite execução por usuários autenticados
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('encontrado', false, 'nome', null);
  END IF;

  SELECT nome INTO v_nome
  FROM base_pdf
  WHERE matricula = p_matricula
  LIMIT 1;

  IF v_nome IS NOT NULL THEN
    v_result := jsonb_build_object('encontrado', true, 'nome', v_nome);
  ELSE
    v_result := jsonb_build_object('encontrado', false, 'nome', null);
  END IF;

  RETURN v_result;
END;
$$;

-- Garante que visitantes autenticados possam chamar a função
GRANT EXECUTE ON FUNCTION public.verificar_matricula_ipen(text) TO authenticated;
