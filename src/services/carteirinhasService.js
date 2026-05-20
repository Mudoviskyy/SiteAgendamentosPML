import { supabase } from '@/lib/supabase';
import { verificarCarteirinhaStatus } from './agendamentosService';

export const carteirinhasService = {

  getCarteirinhaAtiva: async (usuarioId) => {
    try {
      const { data, error } = await supabase
        .from('carteirinhas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'aprovado')
        .gt('validade', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar carteirinha ativa:', error);
      throw error;
    }
  },

  getHistoricoCarteirinhas: async (usuarioId) => {
    try {
      const { data, error } = await supabase
        .from('carteirinhas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw error;
    }
  },

  getPendentesCount: async () => {
    try {
      const { count, error } = await supabase
        .from('carteirinhas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Erro ao contar pendentes:', error);
      return 0;
    }
  },

  cancelarCarteirinha: async (id, motivo) => {
    try {
      const { data, error } = await supabase
        .from('carteirinhas')
        .update({
          status: 'cancelado',
          motivo_cancelamento: motivo,
          validade: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao cancelar carteirinha:', error);
      throw error;
    }
  },

  createCarteirinha: async (dados, documentos, usuarioId, dataEmissao = null) => {
    let novaCarteirinha = null;
    let arquivosEnviados = [];

    try {
      console.log('[Date Tracker] 2. Received in Backend/Service (Must be string):', dataEmissao);

      const status = await verificarCarteirinhaStatus(usuarioId);

      if (!status.podeRenovar) {
        throw new Error(
          `Renovação disponível somente 30 dias antes do vencimento. Restam ${status.diasRestantes} dias.`
        );
      }

      const { data: existente, error: erroExistente } = await supabase
        .from('carteirinhas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('nome_apenado', dados.nome_apenado)
        .in('status', ['pendente', 'aprovado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroExistente) throw erroExistente;

      if (existente) {
        if (existente.status === 'pendente') {
          throw new Error(`Você já possui uma solicitação em análise para este interno (${dados.nome_apenado}).`);
        }

        if (
          existente.status === 'aprovado' &&
          existente.validade &&
          new Date(existente.validade) > new Date()
        ) {
          throw new Error('Você já possui uma carteirinha ativa para este interno.');
        }
      }

      const protocolo = dados.menor_idade ? `MEN-${Date.now().toString().slice(-6)}` : `PML-${Date.now().toString().slice(-6)}`;

      const insertData = {
        usuario_id: usuarioId,
        nome: dados.nome,
        cpf: dados.cpf,
        parentesco: dados.parentesco,
        nome_apenado: dados.nome_apenado,
        telefone: dados.telefone,
        tipo_identificacao: dados.tipo_identificacao || 'CPF',
        tipo_telefone: dados.tipo_telefone || 'BR',
        protocolo,
        status: 'pendente',
        data_emissao: dataEmissao,
        matricula_preso: dados.matricula_preso,
        possui_carteirinha: String(dados.possui_carteirinha)
      };

      // Dados de menor de idade
      if (dados.menor_idade) {
        insertData.menor_idade = true;
        insertData.nome_menor = dados.nome_menor;
        insertData.data_nascimento_menor = dados.data_nascimento_menor;
        insertData.cpf_menor = dados.cpf_menor || null;
      }

      const { data, error } = await supabase
        .from('carteirinhas')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      novaCarteirinha = data;

      const temComprovante = documentos.comprovante_residencia;
      const temDeclaracao = documentos.declaracao_residencia;
      const enviouCarteirinhaOficial = documentos.carteirinha_oficial;

      if (!enviouCarteirinhaOficial && !temComprovante && !temDeclaracao) {
        throw new Error(
          "É necessário enviar comprovante de residência ou declaração de residência."
        );
      }

      for (const [tipo, valor] of Object.entries(documentos)) {
        const arquivos = Array.isArray(valor)
          ? valor.filter(a => a && a.size > 0)
          : (valor && valor.size > 0) ? [valor] : [];

        for (const arquivo of arquivos) {
          if (!arquivo || arquivo.size <= 0) continue;

          const nomeLimpo = arquivo.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w.-]+/g, "_");

          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const path = `${usuarioId}/${novaCarteirinha.id}/${tipo}-${Date.now()}-${randomSuffix}-${nomeLimpo}`;

          console.log(`[Upload] Enviando: ${path} (${arquivo.size} bytes, ${arquivo.type})`);

          const { error: uploadError } = await supabase.storage
            .from("carteirinhas")
            .upload(path, arquivo);

          if (uploadError) {
            console.error(`[Upload] Falha: ${path}`, uploadError);
            throw uploadError;
          }

          console.log(`[Upload] Sucesso: ${path}`);
          arquivosEnviados.push(path);

          const { error: insertError } = await supabase
            .from("carteirinha_documentos")
            .insert({
              carteirinha_id: novaCarteirinha.id,
              tipo_documento: tipo,
              nome_arquivo: arquivo.name,
              url: path
            });

          if (insertError) throw insertError;
        }
      }

      if (arquivosEnviados.length === 0) {
        throw new Error(
          "Falha ao processar os arquivos. Certifique-se de que as fotos estão nítidas e nos formatos aceitos (JPG, PNG ou PDF)."
        );
      }

      return { success: true, protocol: protocolo };

    } catch (error) {
      console.error('Erro ao criar carteirinha:', error);

      if (novaCarteirinha?.id) {
        const { error: deleteError } = await supabase
          .from('carteirinhas')
          .delete()
          .eq('id', novaCarteirinha.id);
        if (deleteError) {
          console.error('[Rollback] FALHA ao deletar carteirinha órfã (id:', novaCarteirinha.id, '):', deleteError);
        }
      }

      if (arquivosEnviados.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("carteirinhas")
          .remove(arquivosEnviados);
        if (removeError) {
          console.error('[Rollback] FALHA ao remover arquivos do storage:', removeError);
        }
      }

      throw error;
    }
  },

  createVinculo: async (dados, documentos, usuarioId) => {
    let novaCarteirinha = null;
    let arquivosEnviados = [];

    try {
      const masterStatus = await verificarCarteirinhaStatus(usuarioId);
      if (!masterStatus.ativa) {
        throw new Error("Você precisa ter uma carteirinha principal ativa para adicionar novos vínculos.");
      }

      const { data: existente } = await supabase
        .from('carteirinhas')
        .select('id, status, nome_apenado')
        .eq('usuario_id', usuarioId)
        .eq('nome_apenado', dados.nome_apenado)
        .in('status', ['pendente', 'aprovado'])
        .maybeSingle();

      if (existente) {
        if (existente.status === 'pendente') throw new Error("Já existe uma solicitação de vínculo pendente para este interno.");
        throw new Error("Este interno já está vinculado à sua carteirinha.");
      }

      const protocolo = `VIN-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('carteirinhas')
        .insert({
          usuario_id: usuarioId,
          nome: dados.nome,
          cpf: dados.cpf,
          parentesco: dados.parentesco,
          nome_apenado: dados.nome_apenado,
          telefone: dados.telefone,
          tipo_identificacao: dados.tipo_identificacao || 'CPF',
          tipo_telefone: dados.tipo_telefone || 'BR',
          protocolo,
          status: 'pendente',
          validade: masterStatus.validade,
          data_emissao: masterStatus.dataEmissao,
          matricula_preso: dados.matricula_preso || null,
          possui_carteirinha: dados.possui_carteirinha != null ? String(dados.possui_carteirinha) : null
        })
        .select()
        .single();

      if (error) throw error;
      novaCarteirinha = data;

      for (const [tipo, valor] of Object.entries(documentos)) {
        if (!valor) continue;
        const arquivos = Array.isArray(valor) ? valor.filter(a => a && a.size > 0) : (valor.size > 0 ? [valor] : []);

        for (const arquivo of arquivos) {
          if (!arquivo || arquivo.size <= 0) continue;

          const nomeLimpo = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_");
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const path = `${usuarioId}/${novaCarteirinha.id}/${tipo}-${Date.now()}-${randomSuffix}-${nomeLimpo}`;

          console.log(`[Upload Vínculo] Enviando: ${path} (${arquivo.size} bytes)`);

          const { error: uploadError } = await supabase.storage
            .from("carteirinhas")
            .upload(path, arquivo);

          if (uploadError) {
            console.error(`[Upload Vínculo] Falha: ${path}`, uploadError);
            throw uploadError;
          }

          arquivosEnviados.push(path);

          await supabase.from("carteirinha_documentos").insert({
            carteirinha_id: novaCarteirinha.id,
            tipo_documento: tipo,
            nome_arquivo: arquivo.name,
            url: path
          });
        }
      }

      if (arquivosEnviados.length === 0) {
        throw new Error("Não foi possível carregar os documentos do vínculo. Tente novamente.");
      }

      return { success: true, protocol: protocolo };

    } catch (error) {
      console.error('Erro ao adicionar vínculo:', error);
      if (novaCarteirinha?.id) {
        const { error: deleteError } = await supabase.from('carteirinhas').delete().eq('id', novaCarteirinha.id);
        if (deleteError) console.error('[Rollback Vínculo] FALHA ao deletar registro órfão:', deleteError);
      }
      if (arquivosEnviados.length > 0) {
        const { error: removeError } = await supabase.storage.from("carteirinhas").remove(arquivosEnviados);
        if (removeError) console.error('[Rollback Vínculo] FALHA ao remover arquivos:', removeError);
      }
      throw error;
    }
  },

  getAllCarteirinhas: async () => {
    try {
      const { data, error } = await supabase
        .from('carteirinhas')
        .select(`*, carteirinha_documentos (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar todas carteirinhas:', error);
      throw error;
    }
  },

  updateCarteirinhaStatus: async (id, status, observacao = null) => {
    try {
      const { data: registro, error: fetchError } = await supabase
        .from('carteirinhas')
        .select('data_emissao, status, protocolo, usuario_id, matricula_preso, menor_idade')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: { user } } = await supabase.auth.getUser();

      const updates = {
        status,
        updated_at: new Date().toISOString(),
        analisado_por: user?.id,
        analisado_em: new Date().toISOString()
      };

      if (observacao) {
        updates.observacao_admin = observacao;
      }

      if (status === 'aprovado') {
        // Desativar com segurança carteirinhas ativas conflitantes antes de aprovar a nova
        if (registro) {
          if (registro.menor_idade) {
            // Caso 1: Carteirinha de menor
            if (registro.nome_menor) {
              const { data: ativasMenor } = await supabase
                .from('carteirinhas')
                .select('id, protocolo')
                .eq('usuario_id', registro.usuario_id)
                .eq('menor_idade', true)
                .eq('nome_menor', registro.nome_menor)
                .eq('status', 'aprovado')
                .neq('id', id);

              if (ativasMenor && ativasMenor.length > 0) {
                for (const ativa of ativasMenor) {
                  await supabase
                    .from('carteirinhas')
                    .update({
                      status: 'cancelado',
                      motivo_cancelamento: `Substituída por renovação (protocolo ${registro.protocolo})`,
                      validade: null,
                      cancelado_por: 'Sistema (Renovação)',
                      cancelado_em: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', ativa.id);
                }
              }
            }
          } else if (!registro.protocolo?.startsWith('PAR-')) {
            // Caso 2: Carteirinha padrão (adulto)
            const { data: ativasPadrao } = await supabase
              .from('carteirinhas')
              .select('id, protocolo, matricula_preso')
              .eq('usuario_id', registro.usuario_id)
              .eq('menor_idade', false)
              .eq('status', 'aprovado')
              .not('protocolo', 'ilike', 'PAR-%')
              .neq('id', id);

            if (ativasPadrao && ativasPadrao.length > 0) {
              const filtradas = ativasPadrao.filter(ativa => {
                if (registro.matricula_preso && registro.matricula_preso !== 'PENDENTE') {
                  return ativa.matricula_preso === registro.matricula_preso;
                } else {
                  return !ativa.matricula_preso || ativa.matricula_preso === 'PENDENTE';
                }
              });

              for (const ativa of filtradas) {
                // Cancelar definitivamente alterando a matrícula para evitar o gatilho de agendamentos
                const matriculaDummy = `CANCELADA_${ativa.matricula_preso || 'SEM_MATRICULA'}`;
                await supabase
                  .from('carteirinhas')
                  .update({
                    status: 'cancelado',
                    matricula_preso: matriculaDummy,
                    motivo_cancelamento: `Substituída por renovação (protocolo ${registro.protocolo})`,
                    validade: null,
                    cancelado_por: 'Sistema (Renovação)',
                    cancelado_em: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', ativa.id);
              }
            }
          }
        }

        let dataFinal;
        let validadeFinal;

        if (registro?.protocolo?.startsWith('VIN-')) {
          const { data: mestre } = await supabase
            .from('carteirinhas')
            .select('data_emissao, validade')
            .eq('usuario_id', registro.usuario_id)
            .not('protocolo', 'ilike', 'VIN-%')
            .eq('status', 'aprovado')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (mestre) {
            dataFinal = mestre.data_emissao;
            validadeFinal = mestre.validade;
          }
        }

        if (!dataFinal) {
          if (registro?.data_emissao) {
            const dataString = typeof registro.data_emissao === 'string' ? registro.data_emissao : String(registro.data_emissao);
            dataFinal = dataString.split('T')[0].split(' ')[0];
          } else {
            dataFinal = new Date().toLocaleDateString('en-CA');
          }
          dataFinal = `${dataFinal}T12:00:00Z`;
        }

        updates.data_emissao = dataFinal;
        if (validadeFinal) {
          updates.validade = validadeFinal;
        }
      }

      const { data, error } = await supabase
        .from('carteirinhas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  },

  updateCarteirinhaAdminData: async (id, statusAdmin, observacaoAdmin) => {
    try {
      const updates = {
        status_admin: statusAdmin,
        observacao_admin: observacaoAdmin,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('carteirinhas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('carteirinha_logs').insert({
          carteirinha_id: id,
          admin_id: userData.user.id,
          status_admin: statusAdmin,
          observacao: observacaoAdmin
        });
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar dados administrativos:', error);
      throw error;
    }
  },

  getFileUrl: async (path) => {
    try {
      if (!path) {
        console.warn('[getFileUrl] Path vazio ou nulo');
        return null;
      }

      // Normaliza: se vier URL completa, extrai apenas o path relativo
      let cleanPath = path;
      if (path.includes("storage/v1/object")) {
        const parts = path.split("carteirinhas/");
        cleanPath = parts[1];
      }

      console.log(`[getFileUrl] Solicitando URL para: ${cleanPath}`);

      const { data, error } = await supabase.storage
        .from('carteirinhas')
        .createSignedUrl(cleanPath, 3600);

      if (error) {
        console.error(`[getFileUrl] Erro ao gerar URL para ${cleanPath}:`, error.message);
        return null;
      }

      return data.signedUrl;

    } catch (error) {
      console.error('[getFileUrl] Erro inesperado:', error);
      return null;
    }
  },

  createCarteirinhaMenor: async (dados, documentos, usuarioId, dataEmissao = null) => {
    let novaCarteirinha = null;
    let arquivosEnviados = [];

    try {
      // Verifica duplicidade apenas para menores com mesmo nome_menor
      const { data: existente } = await supabase
        .from('carteirinhas')
        .select('id, status, nome_menor')
        .eq('usuario_id', usuarioId)
        .eq('menor_idade', true)
        .eq('nome_menor', dados.nome_menor)
        .in('status', ['pendente', 'aprovado'])
        .maybeSingle();

      if (existente) {
        if (existente.status === 'pendente') throw new Error(`Já existe uma solicitação pendente para o menor "${dados.nome_menor}".`);
        if (existente.status === 'aprovado') {
          // Verifica se está vencida para permitir renovação
          const { data: aprovada } = await supabase
            .from('carteirinhas')
            .select('validade')
            .eq('id', existente.id)
            .single();
          if (aprovada?.validade && new Date(aprovada.validade) > new Date()) {
            const diff = Math.ceil((new Date(aprovada.validade) - new Date()) / (1000 * 60 * 60 * 24));
            if (diff > 30) throw new Error(`O menor "${dados.nome_menor}" já possui carteirinha ativa. Renovação disponível 30 dias antes do vencimento (restam ${diff} dias).`);
          }
        }
      }

      const protocolo = `MEN-${Date.now().toString().slice(-6)}`;

      const insertData = {
        usuario_id: usuarioId,
        nome: dados.nome,
        cpf: dados.cpf,
        parentesco: dados.parentesco,
        nome_apenado: dados.nome_apenado,
        telefone: dados.telefone,
        tipo_identificacao: dados.tipo_identificacao || 'CPF',
        tipo_telefone: dados.tipo_telefone || 'BR',
        protocolo,
        status: 'pendente',
        data_emissao: dataEmissao,
        matricula_preso: dados.matricula_preso || null,
        possui_carteirinha: String(dados.possui_carteirinha),
        menor_idade: true,
        nome_menor: dados.nome_menor,
        data_nascimento_menor: dados.data_nascimento_menor,
        cpf_menor: dados.cpf_menor || null,
      };

      const { data, error } = await supabase
        .from('carteirinhas')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      novaCarteirinha = data;

      for (const [tipo, valor] of Object.entries(documentos)) {
        const arquivos = Array.isArray(valor) ? valor.filter(a => a && a.size > 0) : (valor && valor.size > 0) ? [valor] : [];
        for (const arquivo of arquivos) {
          if (!arquivo || arquivo.size <= 0) continue;
          const nomeLimpo = arquivo.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_");
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const path = `${usuarioId}/${novaCarteirinha.id}/${tipo}-${Date.now()}-${randomSuffix}-${nomeLimpo}`;
          console.log(`[Upload Menor] Enviando: ${path} (${arquivo.size} bytes)`);
          const { error: uploadError } = await supabase.storage.from("carteirinhas").upload(path, arquivo);
          if (uploadError) {
            console.error(`[Upload Menor] Falha: ${path}`, uploadError);
            throw uploadError;
          }
          arquivosEnviados.push(path);
          const { error: insertError } = await supabase.from("carteirinha_documentos").insert({
            carteirinha_id: novaCarteirinha.id,
            tipo_documento: tipo,
            nome_arquivo: arquivo.name,
            url: path
          });
          if (insertError) throw insertError;
        }
      }

      if (arquivosEnviados.length === 0) {
        throw new Error("Os documentos da criança não foram processados. Tente enviar novamente.");
      }

      return { success: true, protocol: protocolo };
    } catch (error) {
      console.error('Erro ao criar carteirinha de menor:', error);
      if (novaCarteirinha?.id) {
        const { error: deleteError } = await supabase.from('carteirinhas').delete().eq('id', novaCarteirinha.id);
        if (deleteError) console.error('[Rollback Menor] FALHA ao deletar registro órfão:', deleteError);
      }
      if (arquivosEnviados.length > 0) {
        const { error: removeError } = await supabase.storage.from("carteirinhas").remove(arquivosEnviados);
        if (removeError) console.error('[Rollback Menor] FALHA ao remover arquivos:', removeError);
      }
      throw error;
    }
  },

  createSolicitacaoAlteracaoParentesco: async (dados, arquivo, usuarioId) => {
    let novaCarteirinha = null;
    let arquivoEnviado = null;

    try {
      // Verifica se já existe uma solicitação PAR- pendente para este usuário
      const { data: existente } = await supabase
        .from('carteirinhas')
        .select('id, status')
        .eq('usuario_id', usuarioId)
        .like('protocolo', 'PAR-%')
        .eq('status', 'pendente')
        .maybeSingle();

      if (existente) {
        throw new Error('Você já possui uma solicitação de alteração de parentesco em análise. Aguarde a conclusão antes de enviar outra.');
      }

      const protocolo = `PAR-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('carteirinhas')
        .insert({
          usuario_id: usuarioId,
          nome: dados.nome,
          cpf: dados.cpf,
          parentesco: dados.parentesco_atual,
          parentesco_solicitado: dados.parentesco_solicitado,
          nome_apenado: dados.nome_apenado,
          telefone: dados.telefone,
          tipo_identificacao: dados.tipo_identificacao || 'CPF',
          tipo_telefone: dados.tipo_telefone || 'BR',
          protocolo,
          status: 'pendente',
          matricula_preso: dados.matricula_preso || null,
          possui_carteirinha: 'alteracao_parentesco',
        })
        .select()
        .single();

      if (error) throw error;
      novaCarteirinha = data;

      if (!arquivo || arquivo.size <= 0) {
        throw new Error('O arquivo de certidão não foi processado. Tente novamente.');
      }

      const nomeLimpo = arquivo.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const path = `${usuarioId}/${novaCarteirinha.id}/certidao_casamento-${Date.now()}-${randomSuffix}-${nomeLimpo}`;

      const { error: uploadError } = await supabase.storage
        .from('carteirinhas')
        .upload(path, arquivo);

      if (uploadError) throw uploadError;
      arquivoEnviado = path;

      const { error: insertError } = await supabase
        .from('carteirinha_documentos')
        .insert({
          carteirinha_id: novaCarteirinha.id,
          tipo_documento: 'certidao_casamento',
          nome_arquivo: arquivo.name,
          url: path
        });

      if (insertError) throw insertError;

      return { success: true, protocol: protocolo };

    } catch (error) {
      console.error('Erro ao criar solicitação PAR-:', error);
      if (novaCarteirinha?.id) {
        await supabase.from('carteirinhas').delete().eq('id', novaCarteirinha.id);
      }
      if (arquivoEnviado) {
        await supabase.storage.from('carteirinhas').remove([arquivoEnviado]);
      }
      throw error;
    }
  },

  aprovarAlteracaoParentesco: async (parId, usuarioId, parentescoSolicitado) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Buscar a carteirinha mestre do usuário (não VIN-, não MEN-, não PAR-)
      const { data: mestre, error: erroMestre } = await supabase
        .from('carteirinhas')
        .select('id, parentesco, data_emissao, validade, status')
        .eq('usuario_id', usuarioId)
        .not('protocolo', 'ilike', 'VIN-%')
        .not('protocolo', 'ilike', 'MEN-%')
        .not('protocolo', 'ilike', 'PAR-%')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroMestre) throw erroMestre;
      if (!mestre) throw new Error('Carteirinha mestre do visitante não encontrada.');

      // Atualizar APENAS o parentesco da carteirinha mestre, sem tocar em datas
      const { error: erroUpdate } = await supabase
        .from('carteirinhas')
        .update({ parentesco: parentescoSolicitado })
        .eq('id', mestre.id);

      if (erroUpdate) throw erroUpdate;

      // Marcar a solicitação PAR- como aprovada
      const { error: erroPar } = await supabase
        .from('carteirinhas')
        .update({
          status: 'aprovado',
          analisado_por: user?.id,
          analisado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', parId);

      if (erroPar) throw erroPar;

      return { success: true };
    } catch (error) {
      console.error('Erro ao aprovar alteração de parentesco:', error);
      throw error;
    }
  },

  updateMatricula: async (id, matricula) => {
    try {
      const { data, error } = await supabase
        .from('carteirinhas')
        .update({
          matricula_preso: matricula,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar matrícula:', error);
      throw error;
    }
  }
};