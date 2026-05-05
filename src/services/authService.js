
// DEPRECATED: Auth logic moved to AuthContext to ensure state consistency
// This file is kept to prevent build errors if referenced, but methods warn.
import { supabase } from '@/lib/supabase';

export const signUp = async (email, password, metadata, tipoIdentificacao = 'CPF', tipoTelefone = 'BR') => { 
  console.warn("Use useAuth().register instead"); 
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...metadata,
        tipo_identificacao: tipoIdentificacao,
        tipo_telefone: tipoTelefone
      }
    }
  });
};
export const signIn = async () => { console.warn("Use useAuth().login instead"); };
export const signOut = async () => { console.warn("Use useAuth().logout instead"); };
export const getCurrentUserProfile = async () => { console.warn("Use useAuth().profile instead"); };
