import { supabase } from '@/lib/supabase';

/**
 * Waits for a profile to be created by the database trigger
 * @param {string} userId - The user ID to wait for
 * @param {number} timeout - Max time to wait in ms (default 5000)
 * @returns {Promise<Object|null>} The profile object or null if timed out
 */
export const waitForProfile = async (userId, timeout = 5000) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (data) return data;
    if (error && error.code !== 'PGRST116') console.error('Error checking profile:', error);
    
    // Wait 500ms before next check
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
};

/**
 * Upserts a profile (defensive measure if trigger fails)
 * @param {Object} profileData - The profile data to upsert
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const upsertProfile = async (profileData) => {
  const { error } = await supabase
    .from('perfis')
    .upsert(profileData, { onConflict: 'id' });
    
  if (error) {
    return { success: false, error };
  }
  
  return { success: true };
};