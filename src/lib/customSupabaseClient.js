import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://toojlckoryivrisccfiq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvb2psY2tvcnlpdnJpc2NjZmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDQzMzQsImV4cCI6MjA4NjYyMDMzNH0.4kSApiEU9a0N_Vc4B-Cympo75mW_mGphBwodt51XjlE';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
