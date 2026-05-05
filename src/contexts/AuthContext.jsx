
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertProfile, waitForProfile } from '@/utils/profileUtils';
import { addLog, measurePerf } from '@/utils/logger';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [onlineUsers, setOnlineUsers] = useState(0);

  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [adminApprovalRequired, setAdminApprovalRequired] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadProfile = async (userId) => {
    return await measurePerf('AUTH_LOAD_PROFILE', async () => {
      addLog('AuthContext: Loading Profile', { userId });
      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      addLog('AuthContext: Profile Loaded', { profileFound: !!data, role: data?.role });
      
      if (data) {
        // Fallback for older profiles without these fields
        data.tipo_identificacao = data.tipo_identificacao || 'CPF';
        data.tipo_telefone = data.tipo_telefone || 'BR';
      }

      return data || null;
    });
  };

  const register = async ({
    email,
    password,
    nome_completo,
    cpf,
    telefone,
    data_nascimento,
    tipo_identificacao = 'CPF',
    tipo_telefone = 'BR'
  }) => {
    addLog('AuthContext: Register Attempt', { email, cpf });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome_completo,
            nome_completo,
            cpf,
            telefone,
            data_nascimento,
            tipo_identificacao,
            tipo_telefone
          }
        }
      });

      if (error) {
        addLog('AuthContext: Register Error', { error: error.message }, 'ERROR');
        return { success: false, error: error.message };
      }

      if (!data?.user) {
        addLog('AuthContext: Register Failed No User', {}, 'ERROR');
        return { success: false, error: "Falha ao criar usuário" };
      }

      const profile = await waitForProfile(data.user.id);
      
      if (!profile) {
        addLog('AuthContext: Register - Defensive Profile Upsert', { userId: data.user.id }, 'WARN');
        const upsertResult = await upsertProfile({
          id: data.user.id,
          nome: nome_completo,
          nome_completo,
          cpf,
          telefone: telefone || '',
          data_nascimento,
          email,
          role: 'visitante',
          aprovado: false,
          created_at: new Date().toISOString(),
          tipo_identificacao,
          tipo_telefone
        });
        
        if (!upsertResult.success) {
          console.error('Defensive upsert failed:', upsertResult.error);
        }
      }

      addLog('AuthContext: Register Success', { userId: data.user.id }, 'SUCCESS');
      return { success: true };

    } catch (err) {
      addLog('AuthContext: Register Unexpected Error', { error: err.message }, 'ERROR');
      console.error("Erro inesperado:", err);
      return { success: false, error: "Erro inesperado ao criar conta." };
    }
  };

  const updateProfile = async ({ nome_completo, telefone }) => {
    const { error } = await supabase
      .from('perfis')
      .update({
        nome: nome_completo,
        nome_completo,
        telefone
      })
      .eq('id', user.id);

    if (error) {
      addLog('AuthContext: Update Profile Error', { error: error.message }, 'ERROR');
      return { success: false, error: error.message };
    }

    const updatedProfile = await loadProfile(user.id);
    setProfile(updatedProfile);
    addLog('AuthContext: Profile Updated', { userId: user.id }, 'SUCCESS');

    return { success: true };
  };

  const updateEmail = async (novoEmail) => {
    const { error } = await supabase.auth.updateUser({
      email: novoEmail
    });

    if (error) {
      addLog('AuthContext: Update Email Error', { error: error.message }, 'ERROR');
      return { success: false, error: error.message };
    }

    await supabase
      .from('perfis')
      .update({ email: novoEmail })
      .eq('id', user.id);

    addLog('AuthContext: Email Update Requested', { email: novoEmail }, 'INFO');
    return { success: true };
  };

  useEffect(() => {
    addLog('AuthContext: Mount / Init Effect Started');
    
    let presenceChannel = null;

    const init = async () => {
      addLog('AuthContext: Calling getSession()');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      addLog('AuthContext: getSession() Result', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        error: error?.message 
      });

      if (session?.user) {
        setUser(session.user);
        const profileData = await loadProfile(session.user.id);
        setProfile(profileData);
        setupPresence(session.user);
      }

      setLoading(false);
      addLog('AuthContext: Init Complete', { loading: false });
    };

    const setupPresence = (userData) => {
      if (presenceChannel) presenceChannel.unsubscribe();

      presenceChannel = supabase.channel('online-status', {
        config: { presence: { key: userData.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const count = Object.keys(state).length;
          setOnlineUsers(count);
          addLog('SYSTEM_PRESENCE_SYNC', { onlineCount: count }, 'INFO');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: userData.id,
              online_at: new Date().toISOString(),
            });
            addLog('SYSTEM_PRESENCE_TRACKED', { userId: userData.id }, 'SUCCESS');
          }
        });
    };

    init();

    addLog('AuthContext: Setting up onAuthStateChange listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addLog('AuthContext: onAuthStateChange Event Fired', { 
        event, 
        hasSession: !!session,
        userId: session?.user?.id
      }, 'INFO');

      if (session?.user) {
        setUser(session.user);
        const profileData = await loadProfile(session.user.id);
        if (profileData) {
          setProfile(profileData);
          addLog('AuthContext: onAuthStateChange -> Profile Sync', { role: profileData.role }, 'SUCCESS');
        }
        setupPresence(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setOnlineUsers(0);
        if (presenceChannel) presenceChannel.unsubscribe();
      }
    });

    return () => {
      addLog('AuthContext: Unmounting, cleaning up listener');
      subscription.unsubscribe();
      if (presenceChannel) presenceChannel.unsubscribe();
    };
  }, []);

  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  const login = async (email, password) => {
    addLog('AuthContext: Login Attempt', { email });
    setEmailConfirmationRequired(false);
    setAdminApprovalRequired(false);
    setAuthError(null);

    const result = await measurePerf('AUTH_SIGN_IN', async () => {
      return await supabase.auth.signInWithPassword({ email, password });
    });

    if (lockUntil && Date.now() < lockUntil) {
      return { success: false, error: 'Muitas tentativas. Aguarde.' };
    }

    const { data, error } = result;

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockUntil(Date.now() + 5 * 60 * 1000);
      }
  
      addLog('AuthContext: Login Error', { error: error.message }, 'ERRO Muitas tentativas, aguarde.');
      setAuthError(error.message);
      return { success: false, error: error.message };
    }

    if (data?.user) {
      addLog('AuthContext: Login Success, Validating Profile', { userId: data.user.id });
      const userObj = data.user;
      const profileData = await loadProfile(userObj.id);

      const isEmailConfirmed = !!userObj.email_confirmed_at;
      const isApproved = profileData?.aprovado === true || profileData?.role === 'admin';

      if (!isEmailConfirmed) {
        addLog('AuthContext: Login Blocked - Email Not Confirmed', {}, 'WARN');
        setEmailConfirmationRequired(true);
        setAuthError("Confirme seu email antes de acessar o sistema.");
        await supabase.auth.signOut();
        return { success: false, error: "Confirme seu email antes de acessar o sistema." };
      }

      if (!isApproved) {
        addLog('AuthContext: Login Blocked - Pending Admin Approval', {}, 'WARN');
        setAdminApprovalRequired(true);
        setAuthError("Sua conta está aguardando aprovação administrativa.");
        await supabase.auth.signOut();
        return { success: false, error: "Sua conta está aguardando aprovação administrativa." };
      }

      setUser(userObj);
      setProfile(profileData);
      addLog('AuthContext: Login Fully Successful & Approved', { role: profileData?.role }, 'SUCCESS');
      return { success: true, profile: profileData };
    }

    return { success: true };
  };

  const logout = async () => {
    addLog('AuthContext: Logout Attempt');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setEmailConfirmationRequired(false);
    setAdminApprovalRequired(false);
    setAuthError(null);
    setOnlineUsers(0);
    addLog('AuthContext: Logout Complete', {}, 'SUCCESS');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        onlineUsers,
        login,
        logout,
        register,
        updateProfile,
        updateEmail,
        isAuthenticated: !!user,
        role: profile?.role,
        isApproved: profile?.aprovado === true,
        emailConfirmationRequired,
        adminApprovalRequired,
        authError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
