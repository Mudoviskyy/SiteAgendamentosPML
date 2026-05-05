
import { TIPOS_IDENTIFICACAO, TIPOS_TELEFONE } from './identificacao';

/**
 * Retorna true se o perfil for de um visitante estrangeiro.
 */
export const isForeignProfile = (profile) => {
  return profile?.tipo_identificacao === TIPOS_IDENTIFICACAO.ESTRANGEIRO;
};

/**
 * Retorna o label adequado para o campo de documento principal.
 */
export const getPrimaryDocumentLabel = (profile) => {
  return isForeignProfile(profile) 
    ? "Seu Documento Estrangeiro (Visitante Principal)" 
    : "Seu CPF (Visitante Principal)";
};

/**
 * Retorna o valor do documento principal do perfil.
 * (No banco de dados legado, o documento estrangeiro é salvo na coluna 'cpf').
 */
export const getPrimaryDocumentValue = (profile) => {
  return profile?.cpf || '';
};

/**
 * Retorna o valor do telefone do perfil.
 */
export const getPrimaryPhoneValue = (profile) => {
  return profile?.telefone || '';
};

/**
 * Verifica se o perfil deve ser validado com as regras estritas de CPF brasileiro.
 */
export const shouldValidateAsCPF = (profile) => {
  return !profile?.tipo_identificacao || profile?.tipo_identificacao === TIPOS_IDENTIFICACAO.CPF;
};

/**
 * Valida o formato básico de 11 dígitos para CPF (sem cálculo de dígito verificador, 
 * apenas para checks de interface simplificados conforme o modal).
 */
export const isValidBrazilianCPF = (value) => {
  const clean = (value || '').replace(/\D/g, '');
  return clean.length === 11;
};
