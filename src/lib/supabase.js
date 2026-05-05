
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    storage: window.localStorage,
  },
});

addLog('Supabase Client Init - After Create', {
  detectSessionInUrl: true
});

export default supabase;
