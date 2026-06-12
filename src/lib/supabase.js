
import { createClient } from '@supabase/supabase-js';
import { addLog } from '@/utils/logger';

// Temporary fallback: Intercept hash-based password reset tokens 
// and redirect them to use standard query string parameters.
if (typeof window !== 'undefined') {
  const hash = window.location.hash;
  if (hash.includes('redefinir-senha') && hash.includes('access_token=')) {
    addLog('Supabase Client Init - Hash Intercepted', { hash });
    
    // Extract the token segment from the hash
    const tokenPart = hash.split('#').find(part => part.includes('access_token='));
    
    if (tokenPart) {
      // Redirect to the clean query string format
      const newUrl = `/redefinir-senha?${tokenPart}`;
      addLog('Supabase Client Init - Redirecting', { newUrl });
      window.location.replace(newUrl);
    }
  }
}

import { toast } from '@/components/ui/use-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom fetch to handle connection timeouts/overloads globally
const customFetch = async (url, options = {}) => {
  const isStorage = url.includes('/storage/');
  const timeoutMs = isStorage ? 90000 : 15000; // 90 segundos para storage (uploads/downloads), 15 segundos para consultas normais
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Status codes often associated with server overload or gateway timeouts
    if ([502, 503, 504].includes(response.status)) {
      toast({
        title: "Servidor Carregado",
        description: "O servidor está com muitos acessos, por favor tente em instantes.",
        variant: "destructive",
      });
      
      addLog('SUPABASE_FETCH_OVERLOAD', { status: response.status, url }, 'ERROR');
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      addLog('SUPABASE_FETCH_TIMEOUT', { url }, 'ERROR');
      // Não mostramos toast aqui para não irritar o usuário em cada retry, 
      // mas o log ajuda a diagnosticar.
    }

    // Network errors like "Failed to fetch" often happen during total connection saturation
    const isNetworkError = error instanceof TypeError || error.message?.includes('fetch');
    
    if (isNetworkError && error.name !== 'AbortError') {
      toast({
        title: "Erro de Conexão",
        description: "Verifique sua conexão ou tente novamente em breve.",
        variant: "destructive",
      });
      
      addLog('SUPABASE_FETCH_NETWORK_ERROR', { error: error.message, url }, 'ERROR');
    }
    
    throw error;
  }
};

addLog('Supabase Client Init - Before Create', {
  href: typeof window !== 'undefined' ? window.location.href : 'SSR',
  search: typeof window !== 'undefined' ? window.location.search : '',
  hash: typeof window !== 'undefined' ? window.location.hash : ''
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: customFetch
  }
});

addLog('Supabase Client Init - After Create', {
  detectSessionInUrl: true
});

export default supabase;
