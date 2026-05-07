import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Lista de domínios descartáveis comuns para bloqueio imediato
const DISPOSABLE_DOMAINS = [
  'yopmail.com', 'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 
  'tempmail.com', '10minutemail.com', '0-mail.com', 'sharklasers.com',
  'mail-drop.net', 'dispostable.com', 'getnada.com', 'owlymail.com'
];

async function rollbackUser(supabaseAdmin: any, user_id: string) {
  if (!user_id) return;
  console.log("Rollback - removendo usuário:", user_id);
  try {
    await supabaseAdmin.from("agendamentos").delete().eq("id_visitante", user_id);
    await supabaseAdmin.from("carteirinhas").delete().eq("usuario_id", user_id);
    await supabaseAdmin.from("perfis").delete().eq("id", user_id);
    await supabaseAdmin.auth.admin.deleteUser(user_id);
  } catch (err) {
    console.error("Erro no rollback de usuário:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let supabaseAdmin: any;
  let user_id: string | undefined;

  try {
    const body = await req.json();
    const email = body.email;
    const nome = body.nome;
    user_id = body.user_id;
    const tipo_identificacao = body.tipo_identificacao;
    const tipo_telefone = body.tipo_telefone;
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Validação Preemptiva de Domínio
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
      console.log(`DOMÍNIO BLOQUEADO: ${domain}`);
      await rollbackUser(supabaseAdmin, user_id!);
      return new Response(JSON.stringify({
        success: false,
        type: "BOUNCE",
        error: "E-mails temporários não são permitidos. Use um e-mail real."
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Atualiza o Perfil
    const { error: dbError } = await supabaseAdmin
      .from('perfis')
      .update({ tipo_identificacao, tipo_telefone })
      .eq('id', user_id);

    if (dbError) {
      await rollbackUser(supabaseAdmin, user_id!);
      throw new Error("Erro ao atualizar banco: " + dbError.message);
    }

    // 3. Envia o E-mail via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Presídio Masculino de Lages <no-reply@presidiomasculinolages.com>",
        to: [email],
        subject: "Confirmação de Cadastro - PML",
        html: `<p>Olá <strong>${nome}</strong>, confirme seu e-mail para prosseguir.</p>`
      })
    });

    const resendData = await resendRes.json().catch(() => ({}));
    console.log("RESEND FULL RESPONSE:", JSON.stringify(resendData));

    // 4a. Limite diário atingido (429) — problema temporário, faz rollback com mensagem clara
    if (resendRes.status === 429) {
      console.warn("RESEND RATE LIMIT ATINGIDO:", resendData);
      await rollbackUser(supabaseAdmin, user_id!);
      return new Response(JSON.stringify({
        success: false,
        type: "RATE_LIMIT",
        error: "Limite de e-mails atingido para o site, tente novamente amanhã."
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4b. Outros erros do Resend — bounce/e-mail inválido (400, 422, etc.)
    const errorMsg = resendData?.message || "";
    const isInvalid = errorMsg.toLowerCase().includes("suppression") || 
                     errorMsg.toLowerCase().includes("bounce") ||
                     email === "bounce@resend.dev" ||
                     resendRes.status >= 400;

    if (isInvalid) {
      await rollbackUser(supabaseAdmin, user_id!);
      return new Response(JSON.stringify({
        success: false,
        type: "BOUNCE",
        error: errorMsg || "E-mail inválido ou inexistente"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("ERRO INTERNO EDGE:", error);
    if (supabaseAdmin && user_id) {
      await rollbackUser(supabaseAdmin, user_id);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
