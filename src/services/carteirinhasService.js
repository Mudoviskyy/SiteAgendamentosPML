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

      return { success: true, protocol: protocolo };

    } catch (error) {
      console.error('Erro ao criar carteirinha:', error);

      if (novaCarteirinha?.id) {
        await supabase
          .from('carteirinhas')
          .delete()
          .eq('id', novaCarteirinha.id);
      }

      if (arquivosEnviados.length > 0) {
        await supabase.storage
          .from("carteirinhas")
          .remove(arquivosEnviados);
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

      return { success: true, protocol: protocolo };

    } catch (error) {
      console.error('Erro ao adicionar vínculo:', error);
      if (novaCarteirinha?.id) await supabase.from('carteirinhas').delete().eq('id', novaCarteirinha.id);
      if (arquivosEnviados.length > 0) await supabase.storage.from("carteirinhas").remove(arquivosEnviados);
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

      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      if (observacao) {
        updates.observacao_admin = observacao;
      }

      if (status === 'aprovado') {
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

      return { success: true, protocol: protocolo };
    } catch (error) {
      console.error('Erro ao criar carteirinha de menor:', error);
      if (novaCarteirinha?.id) await supabase.from('carteirinhas').delete().eq('id', novaCarteirinha.id);
      if (arquivosEnviados.length > 0) await supabase.storage.from("carteirinhas").remove(arquivosEnviados);
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