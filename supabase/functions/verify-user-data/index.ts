import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Configuração do Rate Limit em memória (best effort)
// Como Deno KV não é suportado nas Edge Functions do Supabase e causa falha de boot (CORS 500),
// usamos um Map em memória para evitar crashes, com mecanismo simples de limpeza.
const rateLimitMap = new Map<string, { count: number; start: number }>();
const WINDOW_MS = 60000; // 1 minuto
const MAX_REQUESTS = 15; // Max 15 consultas por minuto por IP

Deno.serve(async (req: Request) => {
  // CORS pré-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    // Rate Limiting Logic (Best Effort em Memória)
    const now = Date.now();
    let current = rateLimitMap.get(ip);

    if (!current || now - current.start > WINDOW_MS) {
      current = { count: 1, start: now };
    } else {
      current.count++;
    }
    
    rateLimitMap.set(ip, current);

    if (current.count > MAX_REQUESTS) {
      console.warn(`Rate limit atingido pelo IP: ${ip}`);
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente mais tarde." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Limpeza periódica do Map para evitar consumo excessivo de memória
    if (rateLimitMap.size > 500) {
      for (const [key, value] of rateLimitMap.entries()) {
        if (now - value.start > WINDOW_MS) {
          rateLimitMap.delete(key);
        }
      }
    }

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
