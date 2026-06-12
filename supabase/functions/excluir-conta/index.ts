import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente admin (service role) para todas as operações
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Extrai o token do header Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Valida o JWT usando o admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("[EXCLUIR CONTA] Erro de autenticação:", authError?.message);
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = user.id;
    console.log(`[EXCLUIR CONTA] Iniciando exclusão para userId: ${userId}`);

    // ─────────────────────────────────────────────────────────────────
    // PASSO 1: Listar e deletar todos os arquivos do usuário no storage
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Listando arquivos no bucket 'carteirinhas/${userId}'...`);
    const { data: listedFiles, error: listError } = await supabaseAdmin.storage
      .from('carteirinhas')
      .list(userId, { limit: 500 });

    if (listError) {
      console.warn(`[EXCLUIR CONTA] Aviso ao listar arquivos raiz: ${listError.message}`);
    }

    if (listedFiles && listedFiles.length > 0) {
      const allFilePaths: string[] = [];

      for (const item of listedFiles) {
        if (item.id === null) {
          // É uma subpasta (por carteirinha_id), listar conteúdo interno
          const subFolder = `${userId}/${item.name}`;
          const { data: subFiles } = await supabaseAdmin.storage
            .from('carteirinhas')
            .list(subFolder, { limit: 500 });

          if (subFiles) {
            for (const subFile of subFiles) {
              if (subFile.id !== null) {
                allFilePaths.push(`${subFolder}/${subFile.name}`);
              }
            }
          }
        } else {
          allFilePaths.push(`${userId}/${item.name}`);
        }
      }

      if (allFilePaths.length > 0) {
        console.log(`[EXCLUIR CONTA] Removendo ${allFilePaths.length} arquivo(s)...`);
        const { error: removeError } = await supabaseAdmin.storage
          .from('carteirinhas')
          .remove(allFilePaths);

        if (removeError) {
          console.warn(`[EXCLUIR CONTA] Aviso ao remover arquivos: ${removeError.message}`);
        } else {
          console.log(`[EXCLUIR CONTA] Arquivos removidos com sucesso.`);
        }
      }
    } else {
      console.log(`[EXCLUIR CONTA] Nenhum arquivo encontrado no storage.`);
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSO 2: Cancelar agendamentos FUTUROS (ativo/pendente)
    // Justificativa: datas futuras ainda têm impacto operacional, então
    // cancelamos explicitamente para liberar a vaga.
    // ─────────────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    console.log(`[EXCLUIR CONTA] Cancelando agendamentos futuros (a partir de ${today})...`);

    const { data: futureAgendamentos } = await supabaseAdmin
      .from('agendamentos')
      .select('id, vagas_configuracao!inner(data_visita)')
      .eq('id_visitante', userId)
      .in('status', ['pendente', 'aprovado'])
      .gte('vagas_configuracao.data_visita', today);

    if (futureAgendamentos && futureAgendamentos.length > 0) {
      const ids = futureAgendamentos.map((a: any) => a.id);
      const { error: cancelError } = await supabaseAdmin
        .from('agendamentos')
        .update({
          status: 'cancelado',
          motivo_recusa: 'Conta excluída pelo titular (LGPD - Art. 18)',
        })
        .in('id', ids);

      if (cancelError) {
        console.warn(`[EXCLUIR CONTA] Aviso ao cancelar agendamentos futuros: ${cancelError.message}`);
      } else {
        console.log(`[EXCLUIR CONTA] ${ids.length} agendamento(s) futuro(s) cancelado(s).`);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSO 2.1: Anonimizar todos os agendamentos (passados e futuros)
    // Justificativa LGPD: O registro de que "uma visita ocorreu" é obrigação
    // de segurança pública (Art. 4º, III, "a"). Os dados PESSOAIS do visitante
    // são removidos, mas o registro histórico é preservado anonimizado.
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Anonimizando todos os agendamentos...`);
    const { error: anonError } = await supabaseAdmin
      .from('agendamentos')
      .update({
        visitante1_nome: 'Visitante Anônimo (Conta Excluída)',
        visitante1_carteirinha: 'CONTA-EXCLUIDA',
        visitante2_nome: null,
        visitante2_carteirinha: null,
        visitante3_nome: null,
        visitante3_carteirinha: null,
        whatsapp: '00000000000',
        email: 'anonimo@excluido.invalid',
        ip_address: '0.0.0.0',
      })
      .eq('id_visitante', userId);

    if (anonError) {
      console.warn(`[EXCLUIR CONTA] Aviso ao anonimizar agendamentos: ${anonError.message}`);
    } else {
      console.log(`[EXCLUIR CONTA] Todos os agendamentos foram anonimizados.`);
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSO 3: Cancelar carteirinhas ativas/pendentes
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Cancelando carteirinhas...`);
    await supabaseAdmin
      .from('carteirinhas')
      .update({
        status: 'cancelado',
        motivo_cancelamento: 'Conta excluída pelo titular (LGPD - Art. 18)',
        updated_at: new Date().toISOString()
      })
      .eq('usuario_id', userId)
      .in('status', ['pendente', 'aprovado']);

    // ─────────────────────────────────────────────────────────────────
    // PASSO 4: Fechar tickets de suporte abertos
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Fechando tickets de suporte...`);
    const { error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'fechado', updated_at: new Date().toISOString() } )
      .eq('visitante_id', userId)
      .in('status', ['aberto', 'em_analise', 'aguardando_visitante']);

    if (ticketsError) {
      console.warn(`[EXCLUIR CONTA] Aviso ao fechar tickets: ${ticketsError.message}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSO 5: Deletar perfil do usuário
    // (fila_espera será removida automaticamente por ON DELETE CASCADE)
    // (agendamentos terão id_visitante=NULL por ON DELETE SET NULL)
    // (solicitacoes_carteirinha será removida por ON DELETE CASCADE em auth.users)
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Deletando perfil...`);
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .delete()
      .eq('id', userId);

    if (perfilError) {
      console.error(`[EXCLUIR CONTA] ERRO ao deletar perfil: ${perfilError.message}`);
      return new Response(JSON.stringify({
        error: "Erro ao remover dados do perfil. Entre em contato com o suporte.",
        detail: perfilError.message
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // PASSO 6: Deletar usuário do auth.users (definitivo)
    // (solicitacoes_carteirinha será removida automaticamente por ON DELETE CASCADE)
    // ─────────────────────────────────────────────────────────────────
    console.log(`[EXCLUIR CONTA] Deletando usuário do auth...`);
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error(`[EXCLUIR CONTA] ERRO CRÍTICO ao deletar auth.user: ${deleteAuthError.message}`);
      return new Response(JSON.stringify({
        error: "Erro ao excluir conta. Entre em contato com o suporte.",
        detail: deleteAuthError.message
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[EXCLUIR CONTA] Usuário ${userId} excluído com sucesso.`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[EXCLUIR CONTA] Erro inesperado:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
