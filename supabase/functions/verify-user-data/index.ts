import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Configuração do Rate Limit via Deno KV
// Usamos uma API nativa do Deno Deploy (Edge Functions) para armazenar os hits.
const kv = await Deno.openKv();
const WINDOW_MS = 60000; // 1 minuto
const MAX_REQUESTS = 10; // Max 10 consultas por minuto por IP

serve(async (req) => {
  // CORS pré-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    // Rate Limiting Logic
    const rlKey = ["rate_limit", ip];
    const res = await kv.get(rlKey);
    let current = res.value as { count: number, start: number } | null;
    const now = Date.now();

    if (!current || now - current.start > WINDOW_MS) {
      current = { count: 1, start: now };
    } else {
      current.count++;
      if (current.count > MAX_REQUESTS) {
        console.warn(`Rate limit atingido pelo IP: ${ip}`);
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    await kv.set(rlKey, current, { expireIn: WINDOW_MS });

    const { type, value } = await req.json();

    if (!type || !value) {
      return new Response(JSON.stringify({ error: "Faltam parâmetros 'type' ou 'value'." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Usamos a SERVICE_ROLE para poder consultar as funções bloqueadas no BD
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let exists = false;

    if (type === "cpf") {
      const { data, error } = await supabaseAdmin.rpc("verificar_cpf_existe", { cpf_input: value });
      if (error) throw error;
      exists = data;
    } else if (type === "email") {
      const { data, error } = await supabaseAdmin.rpc("verificar_email_existe", { email_input: value });
      if (error) throw error;
      exists = data;
    } else {
      return new Response(JSON.stringify({ error: "Tipo de verificação inválido." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("ERRO na checagem de dados:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
