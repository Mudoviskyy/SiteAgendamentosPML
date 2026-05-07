CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo            text;
  v_nome            text;
  v_matricula       text;
  v_cpf             text;
  v_cpf_normalizado text;
  v_data_nascimento date;
  v_telefone        text;
  v_nome_completo   text;
  v_cpf_existente   uuid;
BEGIN
  -- Extrair tipo de usuário
  v_tipo := NEW.raw_user_meta_data->>'tipo_usuario';
  RAISE NOTICE '[handle_new_user] Iniciando para user_id: %, tipo: %', NEW.id, v_tipo;

  IF v_tipo = 'servidor' THEN
    v_nome      := COALESCE(NEW.raw_user_meta_data->>'nome', '');
    v_matricula := COALESCE(NEW.raw_user_meta_data->>'matricula', '');

    IF v_matricula = '' THEN
      RAISE EXCEPTION 'Matrícula é obrigatória para cadastro de servidor';
    END IF;

    -- Verificar se matrícula já existe (evitar duplicata de servidor)
    IF EXISTS (SELECT 1 FROM public.servidores WHERE matricula = v_matricula) THEN
      RAISE EXCEPTION 'Matrícula % já cadastrada. Não é possível criar novo usuário.', v_matricula;
    END IF;

    RAISE NOTICE '[handle_new_user] Inserindo servidor para user_id: %, matricula: %', NEW.id, v_matricula;

    INSERT INTO public.servidores (user_id, nome, matricula, ativo, role)
    VALUES (NEW.id, v_nome, v_matricula, true, 'servidor');

  ELSIF v_tipo = 'visitante' THEN
    v_nome          := COALESCE(NEW.raw_user_meta_data->>'nome', '');
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', '');
    v_cpf           := COALESCE(NEW.raw_user_meta_data->>'cpf', '');
    v_telefone      := REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'telefone', ''), '\D', '', 'g');

    -- CPF é obrigatório
    IF v_cpf = '' THEN
      RAISE EXCEPTION 'CPF é obrigatório para cadastro de visitante';
    END IF;

    -- Normalizar CPF (apenas números)
    v_cpf_normalizado := REGEXP_REPLACE(v_cpf, '\D', '', 'g');

    -- Verificar se CPF já existe ANTES de inserir
    SELECT id INTO v_cpf_existente
    FROM public.perfis
    WHERE REGEXP_REPLACE(cpf, '\D', '', 'g') = v_cpf_normalizado
    LIMIT 1;

    IF v_cpf_existente IS NOT NULL THEN
      -- Se levantarmos uma exceção, o Supabase Auth CANCELA a criação do auth.user
      -- Isso impede 100% que fiquem contas órfãs no sistema!
      RAISE EXCEPTION 'Documento já cadastrado no sistema (perfil: %).', v_cpf_existente;
    END IF;

    -- Verificar se já existe um perfil para este user_id (re-trigger)
    IF EXISTS (SELECT 1 FROM public.perfis WHERE id = NEW.id) THEN
      RAISE NOTICE '[handle_new_user] Perfil já existe para user_id: %. Ignorando.', NEW.id;
      RETURN NEW;
    END IF;

    -- Parsing seguro da data de nascimento
    BEGIN
      IF NEW.raw_user_meta_data->>'data_nascimento' IS NULL
         OR NEW.raw_user_meta_data->>'data_nascimento' = '' THEN
        v_data_nascimento := '1900-01-01'::date;
      ELSE
        v_data_nascimento := (NEW.raw_user_meta_data->>'data_nascimento')::date;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[handle_new_user] Data inválida para user_id: %. Usando padrão 1900-01-01.', NEW.id;
      v_data_nascimento := '1900-01-01'::date;
    END;

    RAISE NOTICE '[handle_new_user] Inserindo visitante para user_id: %, cpf: %', NEW.id, v_cpf_normalizado;

    INSERT INTO public.perfis (id, nome, nome_completo, cpf, telefone, data_nascimento, email, role, aprovado)
    VALUES (
      NEW.id,
      v_nome,
      v_nome_completo,
      v_cpf_normalizado,
      v_telefone,
      v_data_nascimento,
      LOWER(COALESCE(NEW.email, '')),
      'visitante',
      false
    );

  ELSE
    RAISE NOTICE '[handle_new_user] tipo_usuario não reconhecido: % para user_id: %', v_tipo, NEW.id;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Propagar a exceção para que o auth.user NÃO SEJA CRIADO se der algum erro
    RAISE EXCEPTION 'ERRO crítico ao criar perfil: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;
