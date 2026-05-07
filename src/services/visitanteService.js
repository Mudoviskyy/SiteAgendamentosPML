
import { supabase } from '@/lib/supabase';

/**
 * Normaliza um texto para comparação: remove acentos, converte para maiúsculas e faz trim.
 * Compatível com a função normalizeCheck do módulo admin/Agendamentos.jsx.
 */
export const normalizeCheck = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

/**
 * Verifica se uma matrícula existe na base IPEN (base_pdf) via RPC segura.
 * Retorna { encontrado: bool, nome: string|null, nomeNormalizado: string|null }
 */
export const verificarMatriculaIPEN = async (matricula) => {
  if (!matricula || matricula.length !== 6) {
    return { encontrado: false, nome: null, nomeNormalizado: null };
  }

  try {
    const { data, error } = await supabase.rpc('verificar_matricula_ipen', {
      p_matricula: matricula
    });

    if (error) {
      console.error('Erro ao verificar matrícula IPEN:', error);
      return { encontrado: false, nome: null, nomeNormalizado: null, erro: true };
    }

    return {
      encontrado: data?.encontrado ?? false,
      nome: data?.nome ?? null,
      nomeNormalizado: data?.nome ? normalizeCheck(data.nome) : null,
    };
  } catch (err) {
    console.error('Exceção ao verificar matrícula IPEN:', err);
    return { encontrado: false, nome: null, nomeNormalizado: null, erro: true };
  }
};
import { normalizarDocumento, concatenarTelefoneInternacional } from '@/utils/identificacao';

export const checkCPFExists = async (cpf, tipoIdentificacao = 'CPF') => {
  const cpfLimpo = normalizarDocumento(cpf);

  const { data, error } = await supabase.functions.invoke('verify-user-data', {
    body: { type: 'cpf', value: cpfLimpo }
  });

  if (error || !data) {
    console.error('Erro ao verificar documento:', error);
    return false;
  }

  return data.exists;
};

// =============================
// CHECK EMAIL (mantido)
// =============================
export const checkEmailExists = async (email) => {
  const { data, error } = await supabase.functions.invoke('verify-user-data', {
    body: { type: 'email', value: email.toLowerCase() }
  });

  if (error || !data) {
    console.error('Erro ao verificar Email:', error);
    return false;
  }

  return data.exists;
};

/**
 * Registra um novo visitante
 * @param {Object} formData 
 * @param {string} tipoIdentificacao 
 * @param {string} tipoTelefone 
 * @param {string} ddi 
 */
export const signUpVisitor = async (formData, tipoIdentificacao = 'CPF', tipoTelefone = 'BR', ddi = '55') => {
  try {
    const requiredFields = ['nome', 'cpf', 'telefone', 'dataNascimento', 'email', 'senha'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return { success: false, error: `O campo ${field} é obrigatório.` };
      }
    }

    const documentoLimpo = normalizarDocumento(formData.cpf);
    
    let telefoneLimpo = formData.telefone.replace(/\D/g, '');
    if (tipoTelefone === 'INTERNACIONAL') {
      telefoneLimpo = concatenarTelefoneInternacional(ddi, formData.telefone);
    }
    
    const emailLower = formData.email.toLowerCase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailLower,
      password: formData.senha,
      options: {
        emailRedirectTo: 'https://presidiomasculinolages.com/login',
        data: {
          tipo_usuario: "visitante",
          nome: formData.nome,
          nome_completo: formData.nome,
          cpf: documentoLimpo,
          telefone: telefoneLimpo,
          data_nascimento: formData.dataNascimento,
          tipo_identificacao: tipoIdentificacao,
          tipo_telefone: tipoTelefone
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      if (authError.message?.includes('rate limit')) {
        return { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' };
      }
      return { success: false, error: authError.message || 'Erro ao criar conta' };
    }

    if (!authData.user) {
      return { success: false, error: 'Erro ao criar usuário' };
    }

    const user = authData.user;

    try {
      // Aciona a Edge Function que atualiza o perfil e agenda o envio via Resend
      const response = await supabase.functions.invoke(
        "send-confirmation-email",
        {
          body: {
            email: emailLower,
            user_id: user.id,
            nome: formData.nome,
            tipo_identificacao: tipoIdentificacao,
            tipo_telefone: tipoTelefone
          }
        }
      );

      const edgData = response.data;
      const edgeError = response.error;

      // Se ocorreu algum erro técnico OU se o e-mail bateu no nosso filtro de descartáveis, o Edge Function já fez o rollback
      if (edgeError || !edgData || edgData.success !== true) {
        console.error('Falha no cadastro (Síncrono):', edgeError || edgData);

        const errorMsg = edgData?.error || "Ocorreu um erro ao preparar seu cadastro. Tente novamente.";
        return { success: false, error: errorMsg };
      }

      // Sucesso! Bounces assíncronos que acontecerem a partir de agora serão tratados pelo Webhook
      return { success: true, user: user };

    } catch (processError) {
      console.error('Erro de sistema pós-cadastro:', processError);
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }

  } catch (error) {
    console.error('Unexpected signup error:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao registrar' };
  }
};
