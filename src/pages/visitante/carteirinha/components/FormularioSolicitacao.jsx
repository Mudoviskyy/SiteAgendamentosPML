import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Lock, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { carteirinhasService } from '@/services/carteirinhasService';
import ProcessingModal from '@/components/shared/ProcessingModal';
import UploadErrorModal from '@/components/shared/UploadErrorModal';
import { verificarMatriculaIPEN, normalizeCheck } from '@/services/visitanteService';

import {
  TIPOS_IDENTIFICACAO, TIPOS_TELEFONE, DDIS, getIdentificacaoLabel, normalizarDocumento, concatenarTelefoneInternacional
} from '@/utils/identificacao';

import { 
  PARENTESCOS_QUE_EXIGEM_COMPROVACAO, 
  LABEL_PARENTESCO, 
  MAP_VALUE_TO_RULE, 
  DOCUMENTOS_CONFIG, 
  MAX_SIZE, 
  ALLOWED_TYPES 
} from './RequisitosDicas';
import { PARENTESCO_RULES } from '@/utils/parentescoRules';
import UploadDocumentos, { comprimirArquivo } from './UploadDocumentos';

const FormularioSolicitacao = ({ user, profile, onSuccess, setOpenExampleVacina }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [possuiCarteirinha, setPossuiCarteirinha] = useState(null);
  const [parentescoSelecionado, setParentescoSelecionado] = useState("");
  const [nomeApenado, setNomeApenado] = useState("");
  // Alerta IPEN: null = sem alerta | { nomeIPEN, matricula, dadosParaSubmit }
  const [ipenAlerta, setIpenAlerta] = useState(null);

  const [tipoIdentificacao, setTipoIdentificacao] = useState(TIPOS_IDENTIFICACAO.CPF);
  const [tipoTelefone, setTipoTelefone] = useState(TIPOS_TELEFONE.BR);
  const [ddiSelecionado, setDdiSelecionado] = useState('55');
  const [documentoValor, setDocumentoValor] = useState("");
  const [telefoneValor, setTelefoneValor] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState({ dia: "", mes: "", ano: "" });
  const [documentosState, setDocumentosState] = useState({});

  const exigeComprovanteParentesco = PARENTESCOS_QUE_EXIGEM_COMPROVACAO.includes(parentescoSelecionado);
  const ehNovaSolicitacao = possuiCarteirinha === 'nova' || possuiCarteirinha === 'renovacao';

  const dias = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const meses = [
    { v: "01", l: "Jan" }, { v: "02", l: "Fev" }, { v: "03", l: "Mar" }, { v: "04", l: "Abr" },
    { v: "05", l: "Mai" }, { v: "06", l: "Jun" }, { v: "07", l: "Jul" }, { v: "08", l: "Ago" },
    { v: "09", l: "Set" }, { v: "10", l: "Out" }, { v: "11", l: "Nov" }, { v: "12", l: "Dez" }
  ];
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual.toString(), (anoAtual - 1).toString(), (anoAtual - 2).toString(), (anoAtual - 3).toString()];

  useEffect(() => {
    if (profile) {
      setTipoIdentificacao(profile.tipo_identificacao || TIPOS_IDENTIFICACAO.CPF);
      const telefoneInicial = profile.tipo_telefone || (profile.tipo_identificacao === TIPOS_IDENTIFICACAO.ESTRANGEIRO ? TIPOS_TELEFONE.INTERNACIONAL : TIPOS_TELEFONE.BR);
      setTipoTelefone(telefoneInicial);

      let val = profile.cpf || "";
      if (profile.tipo_identificacao === TIPOS_IDENTIFICACAO.CPF) {
        let t = val.replace(/\D/g, '');
        if (t.length > 11) t = t.slice(0, 11);
        val = t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if (t.length < 11) val = profile.cpf;
      }
      setDocumentoValor(val);

      if (telefoneInicial === TIPOS_TELEFONE.INTERNACIONAL) {
        const matchDdi = (profile.telefone || "").match(/^\+?(\d{1,4})/);
        setDdiSelecionado(matchDdi?.[1] || "55");
        setTelefoneValor((profile.telefone || "").replace(/^\+?\d{1,4}/, "").replace(/\D/g, ""));
      } else {
        setDdiSelecionado("55");
        setTelefoneValor(profile.telefone || "");
      }
    }
  }, [profile]);

  const handleTelefoneChange = (e) => {
    let { value } = e.target;
    if (tipoTelefone === TIPOS_TELEFONE.BR) {
      let t = value.replace(/\D/g, "");
      if (t.length > 11) t = t.slice(0, 11);
      if (t.length > 10) value = t.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      else if (t.length > 6) value = t.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
      else if (t.length > 2) value = t.replace(/^(\d{2})(\d+)/, '($1) $2');
      else value = t;
    } else {
      value = normalizarDocumento(value);
    }
    setTelefoneValor(value);
  };

  const handleFileSelect = (e, id) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setDocumentosState(prev => ({ ...prev, [id]: files }));
    } else {
      setDocumentosState(prev => ({ ...prev, [id]: null }));
    }
  };

  const clearFile = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDocumentosState(prev => ({ ...prev, [id]: null }));
    const input = document.getElementById(id);
    if (input) input.value = "";
  };

  const obterInstrucaoParentesco = () => {
    const ruleKey = MAP_VALUE_TO_RULE[parentescoSelecionado];
    if (ruleKey && PARENTESCO_RULES[ruleKey]) {
      return PARENTESCO_RULES[ruleKey].instructions;
    }
    return "Envie os documentos que comprovem o vínculo familiar com o detento.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (parentescoSelecionado === "" || possuiCarteirinha === null) {
      toast({ title: "Escolha obrigatória", description: "Preencha todos os campos obrigatórios.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (!telefoneValor) {
      toast({ title: "Telefone obrigatório", description: "Preencha o seu telefone.", className: "bg-red-500 text-white border-none" });
      return;
    }

    if (!nomeApenado.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome da pessoa que você irá visitar.", className: "bg-red-500 text-white border-none" });
      return;
    }

    const formDataObj = new FormData(e.target);
    const matriculaInput = formDataObj.get("matricula_preso");
    
    if (possuiCarteirinha === true || possuiCarteirinha === 'renovacao') {
      if (!matriculaInput || matriculaInput.length < 6) {
        toast({ title: "Matrícula obrigatória", description: "Informe os 6 números da matrícula do detento.", className: "bg-red-500 text-white border-none" });
        return;
      }
    }

    const telefoneFinal = tipoTelefone === TIPOS_TELEFONE.INTERNACIONAL ? concatenarTelefoneInternacional(ddiSelecionado, telefoneValor) : telefoneValor.replace(/\D/g, "");
    let dataEmissaoFinal = null;

    if (possuiCarteirinha === true) {
      if (!dataSelecionada.dia || !dataSelecionada.mes || !dataSelecionada.ano) {
        toast({ title: "Data de Emissão", description: "Informe a data de emissão no verso da sua carteirinha.", className: "bg-red-500 text-white border-none" });
        return;
      }
      dataEmissaoFinal = `${dataSelecionada.ano}-${dataSelecionada.mes}-${dataSelecionada.dia}`;
      const localDateObj = new Date(dataSelecionada.ano, parseInt(dataSelecionada.mes) - 1, dataSelecionada.dia);
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      if (localDateObj > hoje) {
        toast({ title: "Data inválida", description: "A data não pode ser futura.", className: "bg-red-500 text-white border-none" });
        return;
      }
      const dataCorte = new Date(2025, 8, 10);
      const dataVencimento = new Date(localDateObj);
      dataVencimento.setFullYear(dataVencimento.getFullYear() + (localDateObj < dataCorte ? 1 : 2));
      if (dataVencimento < hoje) {
        toast({ title: "Carteirinha Vencida", description: "A data informada indica que a carteirinha já está vencida.", className: "bg-red-500 text-white border-none" });
        return;
      }
    }


    let documentosRaw = {};

    // Helper: extrai arquivo do FormData, retornando null se vazio (size === 0)
    const getValidFile = (name) => {
      const file = formDataObj.get(name);
      return (file && file instanceof File && file.size > 0) ? file : null;
    };
    // Helper: extrai múltiplos arquivos do FormData, filtrando vazios
    const getValidFiles = (name) => {
      return Array.from(formDataObj.getAll(name) || []).filter(f => f instanceof File && f.size > 0);
    };

    if (possuiCarteirinha === true) {
      documentosRaw = { carteirinha_oficial: getValidFile('carteirinha_oficial') };
    } else {
      documentosRaw = {
        foto_3x4: getValidFile('foto_3x4'),
        rg_frente: getValidFile('rg_frente'),
        rg_verso: getValidFile('rg_verso'),
        comprovante_residencia: getValidFile('comprovante_residencia'),
        declaracao_residencia: getValidFile('declaracao_residencia'),
        declaracao_vacina: getValidFile('declaracao_vacina'),
      };
      if (parentescoSelecionado === "esposoesposa" || parentescoSelecionado === "companheiro") {
        documentosRaw.certidao_casamento = getValidFiles('certidao_casamento');
      }
      if (exigeComprovanteParentesco) {
        documentosRaw.comprovante_parentesco = getValidFiles('comprovante_parentesco');
      }
    }

    if (ehNovaSolicitacao && !documentosRaw.comprovante_residencia && !documentosRaw.declaracao_residencia) {
      toast({ title: "Documento obrigatório", description: "Envie o comprovante de residência.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (ehNovaSolicitacao && exigeComprovanteParentesco && (!documentosRaw.comprovante_parentesco || documentosRaw.comprovante_parentesco.length === 0)) {
      toast({ title: "Documento obrigatório", description: "Envie o comprovante de parentesco.", className: "bg-red-500 text-white border-none" });
      return;
    }

    const documentosOpcionais = ["declaracao_residencia", "comprovante_parentesco"];
    if (parentescoSelecionado !== "esposoesposa" && parentescoSelecionado !== "companheiro") documentosOpcionais.push("certidao_casamento");

    const labelsTraduzidos = {
      foto_3x4: "Foto 3x4",
      rg_frente: "RG Frente (ou CNH)",
      rg_verso: "RG Verso",
      comprovante_residencia: "Comprovante de Residência",
      declaracao_vacina: "Declaração de Vacina",
      carteirinha_oficial: "Foto da Carteirinha Oficial",
      certidao_casamento: "Certidão de Casamento/União Estável",
      comprovante_parentesco: "Comprovante de Parentesco"
    };

    for (const [tipo, valor] of Object.entries(documentosRaw)) {
      const arquivos = Array.isArray(valor) ? valor : (valor ? [valor] : []);
      if (!documentosOpcionais.includes(tipo) && arquivos.length === 0) {
        toast({ 
          title: "Documento faltando", 
          description: `Por favor, anexe o arquivo: ${labelsTraduzidos[tipo] || tipo.replaceAll("_", " ")}`, 
          className: "bg-red-500 text-white border-none" 
        });
        return;
      }
      for (const file of arquivos) {
        if (!file.type || !ALLOWED_TYPES.includes(file.type)) {
          toast({ title: "Formato inválido", description: `O arquivo ${file.name} deve ser PDF, JPG ou PNG.`, className: "bg-red-500 text-white border-none" });
          return;
        }
        if (file.size === 0) {
          toast({ title: "Arquivo corrompido", description: `O arquivo ${file.name} está vazio (0 bytes). Selecione novamente.`, className: "bg-red-500 text-white border-none" });
          return;
        }
      }
    }

    // === VERIFICAÇÃO IPEN (somente quando matrícula é obrigatória) ===
    const matriculaObrigatoria = possuiCarteirinha === true || possuiCarteirinha === 'renovacao';
    if (matriculaObrigatoria && matriculaInput && matriculaInput.length === 6) {
      const resultado = await verificarMatriculaIPEN(matriculaInput);

      if (resultado.erro) {
        // Falha de conexão – avisa mas não bloqueia
        toast({
          title: "Aviso: verificação indisponível",
          description: "Não foi possível verificar a matrícula agora. Revise os dados e tente novamente.",
          className: "bg-amber-500 text-white border-none",
          duration: 5000,
        });
      } else if (!resultado.encontrado) {
        toast({
          title: "Matrícula não encontrada",
          description: "Este número não consta na base IPEN. Verifique se a matrícula está correta na Carteirinha Oficial ou contate o Setor Social.",
          className: "bg-red-500 text-white border-none",
          duration: 8000,
        });
        return;
      } else {
        // Matrícula encontrada – verifica se o nome bate
        const nomeDigitadoNorm = normalizeCheck(nomeApenado);
        if (nomeDigitadoNorm !== resultado.nomeNormalizado) {
          // Nome diverge: exibe alerta com dados para eventual re-submissão
          setIpenAlerta({
            nomeIPEN: resultado.nome,
            nomeDigitado: nomeApenado,
            dadosForm: {
              matriculaInput,
              telefoneFinal,
              dataEmissaoFinal,
              documentosRaw,
            },
          });
          return;
        }
        // Nome OK – usa o nome padronizado do IPEN
        setNomeApenado(resultado.nome);
      }
    }

    // Prossegue com o upload
    const dados = {
      nome: profile.nome_completo,
      cpf: normalizarDocumento(documentoValor),
      tipo_identificacao: tipoIdentificacao,
      tipo_telefone: tipoTelefone,
      parentesco: LABEL_PARENTESCO[parentescoSelecionado] || parentescoSelecionado,
      nome_apenado: nomeApenado,
      matricula_preso: matriculaInput,
      telefone: telefoneFinal,
      possui_carteirinha: possuiCarteirinha,
    };
    await executarUpload(nomeApenado, dados, documentosRaw, dataEmissaoFinal);
  };

  // Executa o upload efetivo (chamado também a partir do alerta IPEN)
  const executarUpload = async (nomeApenadoFinal, dados, documentosRaw, dataEmissaoFinal) => {
    setLoading(true);
    setShowProcessing(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão ou converta os PDFs para JPG e tente novamente.')), 90000)
      );

      const uploadPromise = (async () => {
        const documentos = {};
        for (const [tipo, valor] of Object.entries(documentosRaw)) {
          if (Array.isArray(valor)) documentos[tipo] = await Promise.all(valor.map(comprimirArquivo));
          else documentos[tipo] = await comprimirArquivo(valor);
        }
        for (const file of Object.values(documentos).flat().filter(Boolean)) {
          if (file.size > MAX_SIZE) {
            throw new Error(`O arquivo ${file.name} excede 5MB. Reduza o tamanho e tente novamente.`);
          }
        }

        const dadosFinal = { ...dados, nome_apenado: nomeApenadoFinal };
        return await carteirinhasService.createCarteirinha(dadosFinal, documentos, user.id, dataEmissaoFinal);
      })();

      const result = await Promise.race([uploadPromise, timeoutPromise]);
      onSuccess(result.protocol);
    } catch (err) {
      setUploadError(err.message || 'Erro desconhecido ao enviar.');
    } finally {
      setLoading(false);
      setShowProcessing(false);
    }
  };

  return (
    <>
    <ProcessingModal isOpen={showProcessing} />
    <UploadErrorModal
      isOpen={uploadError !== null}
      onClose={() => setUploadError(null)}
      errorMessage={uploadError}
    />

    {/* ===== MODAL DE ALERTA IPEN – Nome divergente ===== */}
    {ipenAlerta && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-5 border-b border-amber-100 bg-amber-50 rounded-t-2xl flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="font-black text-amber-800 uppercase tracking-wider text-sm">Atenção: Nome Divergente</h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              A matrícula foi localizada no IPEN, porém o <strong>nome do interno</strong> não corresponde ao cadastro oficial.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Nome digitado por você</p>
                <p className="font-mono font-bold text-red-900 text-sm">{ipenAlerta.nomeDigitado?.toUpperCase()}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Nome oficial no IPEN</p>
                <p className="font-mono font-bold text-green-900 text-sm">{ipenAlerta.nomeIPEN}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Se o <strong>Nome Oficial do IPEN</strong> estiver correto, clique em <strong>"Usar nome do IPEN"</strong> para corrigir e enviar automaticamente. Caso contrário, volte e corrija os dados.
              </p>
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIpenAlerta(null)} className="text-xs font-bold uppercase">
              Voltar e Corrigir
            </Button>
            <Button
              disabled={loading}
              onClick={async () => {
                const { dadosForm } = ipenAlerta;
                const nomeCorrigido = ipenAlerta.nomeIPEN;
                const dados = {
                  nome: profile.nome_completo,
                  cpf: normalizarDocumento(documentoValor),
                  tipo_identificacao: tipoIdentificacao,
                  tipo_telefone: tipoTelefone,
                  parentesco: LABEL_PARENTESCO[parentescoSelecionado] || parentescoSelecionado,
                  nome_apenado: nomeCorrigido,
                  matricula_preso: dadosForm.matriculaInput,
                  telefone: dadosForm.telefoneFinal,
                  possui_carteirinha: possuiCarteirinha,
                };
                setNomeApenado(nomeCorrigido);
                setIpenAlerta(null);
                await executarUpload(nomeCorrigido, dados, dadosForm.documentosRaw, dadosForm.dataEmissaoFinal);
              }}
              className="bg-[#2D5016] hover:bg-[#1f3810] text-white text-xs font-bold uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Usar Nome do IPEN e Enviar
            </Button>
          </div>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-4 text-sm text-amber-900 flex items-start gap-3">
        <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <p><strong>Segurança de Dados:</strong> Seu <em>Nome</em> e <em>Documento de Identificação</em> não podem ser alterados nesta tela pois são a chave principal do seu cadastro.</p>
      </div>

      <div className="p-4 bg-gray-100/60 rounded-xl border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Seu Nome (Visitante) <Lock className="w-3 h-3 inline ml-1" /></Label>
            <Input value={profile?.nome_completo || ''} readOnly disabled className="bg-gray-200/50 cursor-not-allowed font-medium text-gray-700" />
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1">{getIdentificacaoLabel(tipoIdentificacao)} <Lock className="w-3 h-3 inline ml-1" /></Label>
            <Input value={documentoValor} readOnly disabled className="bg-gray-200/50 cursor-not-allowed font-mono text-gray-700" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#2D5016]">Tipo de Telefone</Label>
            <div className="flex gap-2 p-1 bg-white rounded-lg border">
              <button type="button" onClick={() => { setTipoTelefone(TIPOS_TELEFONE.BR); setDdiSelecionado("55"); setTelefoneValor(""); }} className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", tipoTelefone === TIPOS_TELEFONE.BR ? "bg-[#2D5016] text-white shadow" : "text-gray-600 hover:bg-gray-100")}>Brasileiro</button>
              <button type="button" onClick={() => { setTipoTelefone(TIPOS_TELEFONE.INTERNACIONAL); setTelefoneValor(""); }} className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", tipoTelefone === TIPOS_TELEFONE.INTERNACIONAL ? "bg-[#2D5016] text-white shadow" : "text-gray-600 hover:bg-gray-100")}>Internacional</button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="text-sm font-semibold text-[#2D5016]">Telefone / WhatsApp</Label>
            {tipoTelefone === TIPOS_TELEFONE.INTERNACIONAL ? (
              <div className="flex gap-2">
                <div className="w-40">
                  <SelectUI value={ddiSelecionado} onValueChange={setDdiSelecionado}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="DDI" /></SelectTrigger>
                    <SelectContent>
                      {DDIS.map((ddi) => <SelectItem key={ddi.value} value={ddi.value}>{ddi.label}</SelectItem>)}
                    </SelectContent>
                  </SelectUI>
                </div>
                <Input id="telefone" name="telefone" type="text" value={telefoneValor} onChange={handleTelefoneChange} placeholder="Número do telefone" className="bg-white" />
              </div>
            ) : (
              <Input id="telefone" name="telefone" type="text" value={telefoneValor} onChange={handleTelefoneChange} placeholder="(49) 99999-9999" className="bg-white" />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold text-[#2D5016]">Quem você irá visitar? (Nome do Detento) *</Label>
          <Input name="nome_apenado" placeholder="Digite o nome completo da pessoa" value={nomeApenado} onChange={(e) => setNomeApenado(e.target.value)} className="bg-white h-12 text-gray-900 border-gray-300 focus:border-[#2D5016]" />
        </div>

        {nomeApenado.trim() !== '' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Seu Parentesco (O que você é do Detento)*</Label>
              <select name="parentesco" value={parentescoSelecionado} onChange={(e) => setParentescoSelecionado(e.target.value)} className="w-full h-12 border border-gray-300 rounded-md bg-white px-3 text-gray-900">
                <option value="">Selecione o parentesco</option>
                {Object.entries(LABEL_PARENTESCO).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p className="text-xs text-gray-500">Para amigo(a), o memorando de autorização é um procedimento interno. Entre em contato com o Setor Social para mais informações.</p>
            </div>
            {exigeComprovanteParentesco && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">Instruções para {LABEL_PARENTESCO[parentescoSelecionado]}:</p>
                <p className="text-sm text-amber-800 mt-2">{obterInstrucaoParentesco()}</p>
              </div>
            )}
          </div>
        )}

        {nomeApenado.trim() !== '' && parentescoSelecionado !== '' && (
          <>
            <div className="space-y-3 p-4 rounded-lg border bg-gray-50 border-gray-300">
              <Label className="text-sm font-bold text-gray-700 uppercase">Qual o tipo da sua solicitação?</Label>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant={possuiCarteirinha === true ? "default" : "outline"} className={possuiCarteirinha === true ? "bg-[#2D5016] text-white hover:bg-[#1f3810]" : ""} onClick={() => setPossuiCarteirinha(true)}>Já tenho carteirinha</Button>
                <Button type="button" variant={possuiCarteirinha === 'nova' ? "default" : "outline"} className={possuiCarteirinha === 'nova' ? "bg-[#2D5016] text-white hover:bg-[#1f3810]" : ""} onClick={() => setPossuiCarteirinha('nova')}>1ª Via (Nova)</Button>
                <Button type="button" variant={possuiCarteirinha === 'renovacao' ? "default" : "outline"} className={possuiCarteirinha === 'renovacao' ? "bg-[#2D5016] text-white hover:bg-[#1f3810]" : ""} onClick={() => setPossuiCarteirinha('renovacao')}>Renovação</Button>
              </div>
              <p className="text-xs text-gray-500"><strong>Já tenho:</strong> Envie apenas o verso da carteirinha com a Data de Emissão. <strong>1ª Via:</strong> Primeira solicitação, envie todos os documentos. <strong>Renovação:</strong> Carteirinha vencida, envie todos os documentos.</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-bold text-gray-800">Documentos Obrigatórios</h3>
              {possuiCarteirinha === null && <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">Selecione acima o tipo da solicitação para liberar os campos corretos.</div>}

              {possuiCarteirinha === true && (
                <div className="space-y-4">
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Label className="text-sm font-bold text-slate-700">Matrícula do Detento (Obrigatório) *</Label>
                    <Input name="matricula_preso" placeholder="Digite exatamente os 6 números" maxLength={6} className="bg-white h-12 text-gray-900 font-mono border-gray-300" />
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-3 mt-2">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[13px] font-bold text-red-900 leading-tight">Cuidado para não errar!</p>
                        <p className="text-[11px] text-red-800 leading-relaxed font-medium">Se você não souber a matrícula, consulte na <strong>Carteirinha Oficial do i-Pen</strong> ou entre em contato com o <strong>Setor Social</strong>. Se o NOME ou o NÚMERO estiverem errados, sua carteirinha será negada.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-amber-50/50 border-amber-200">
                    <Label className="text-sm font-black text-gray-900 uppercase block mb-2">Data de Emissão (Verso da Carteira) *</Label>
                    <p className="text-[11px] text-amber-800 mb-3 leading-tight">Informe a data de emissão original que consta na sua carteirinha física para migrarmos sua validade corretamente.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={dataSelecionada.dia} className="h-11 border border-gray-400 rounded-md bg-white text-gray-900 text-sm" onChange={(e) => setDataSelecionada({ ...dataSelecionada, dia: e.target.value })}><option value="">Dia</option>{dias.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      <select value={dataSelecionada.mes} className="h-11 border border-gray-400 rounded-md bg-white text-gray-900 text-sm" onChange={(e) => setDataSelecionada({ ...dataSelecionada, mes: e.target.value })}><option value="">Mês</option>{meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}</select>
                      <select value={dataSelecionada.ano} className="h-11 border border-gray-400 rounded-md bg-white text-gray-900 text-sm" onChange={(e) => setDataSelecionada({ ...dataSelecionada, ano: e.target.value })}><option value="">Ano</option>{anos.map(a => <option key={a} value={a}>{a}</option>)}</select>
                    </div>
                  </div>
                  <UploadDocumentos 
                    doc={{ name: "carteirinha_oficial", label: "Foto do Verso da Carteirinha Oficial", multiple: false }} 
                    isRequired={true} 
                    documentosState={documentosState} 
                    handleFileSelect={handleFileSelect} 
                    clearFile={clearFile} 
                    setOpenExampleVacina={setOpenExampleVacina} 
                    obterInstrucaoParentesco={obterInstrucaoParentesco}
                  />
                </div>
              )}

              {ehNovaSolicitacao && (
                <>
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Label className="text-sm font-bold text-slate-700">Matrícula do Detento {possuiCarteirinha === 'renovacao' ? '(Obrigatório) *' : '(Opcional)'}</Label>
                    <Input name="matricula_preso" placeholder="Digite exatamente os 6 números" maxLength={6} className="bg-white h-12 text-gray-900 font-mono border-gray-300" />
                    <div className={`${possuiCarteirinha === 'renovacao' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} border p-3 rounded-lg flex gap-3 mt-2`}>
                      <AlertCircle className={`w-5 h-5 ${possuiCarteirinha === 'renovacao' ? 'text-red-600' : 'text-blue-600'} shrink-0 mt-0.5`} />
                      <div className="space-y-1">
                        <p className={`text-[13px] font-bold ${possuiCarteirinha === 'renovacao' ? 'text-red-900' : 'text-blue-900'} leading-tight`}>{possuiCarteirinha === 'renovacao' ? 'Cuidado para não errar!' : 'Não é obrigatório'}</p>
                        <p className={`text-[11px] ${possuiCarteirinha === 'renovacao' ? 'text-red-800' : 'text-blue-800'} leading-relaxed font-medium`}>{possuiCarteirinha === 'renovacao' ? 'Se você não souber a matrícula, consulte na Carteirinha Oficial do i-Pen ou entre em contato com o Setor Social. Se o NOME ou o NÚMERO estiverem errados, sua carteirinha será negada.' : 'Se souber a matrícula, informe para agilizar a análise. Caso não saiba pode deixar em branco ou consulte na Carteirinha Oficial do i-Pen ou com o Setor Social.'}</p>
                      </div>
                    </div>
                  </div>
                  {DOCUMENTOS_CONFIG.filter((doc) => {
                    if (doc.name === "comprovante_parentesco") return exigeComprovanteParentesco;
                    if (doc.name === "certidao_casamento") return parentescoSelecionado === "esposoesposa" || parentescoSelecionado === "companheiro";
                    return true;
                  }).map((doc) => {
                    const isComprovanteParentesco = doc.name === "comprovante_parentesco";
                    const isRequired = !doc.optional || isComprovanteParentesco;
                    return (
                      <UploadDocumentos 
                        key={doc.name} 
                        doc={doc} 
                        isRequired={isRequired} 
                        documentosState={documentosState} 
                        handleFileSelect={handleFileSelect} 
                        clearFile={clearFile} 
                        setOpenExampleVacina={setOpenExampleVacina} 
                        obterInstrucaoParentesco={obterInstrucaoParentesco}
                      />
                    );
                  })}
                </>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mt-8 mb-2 animate-in fade-in slide-in-from-bottom-2">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800 uppercase tracking-tight">Processamento de arquivos</p>
                <p className="text-xs text-amber-700 leading-relaxed">Após clicar, aguarde alguns instantes. O sistema vai diminuir o tamanho dos arquivos e enviará eles com segurança para o servidor. Isso pode levar até um minuto dependendo da sua conexão.</p>
              </div>
            </div>

            <Button disabled={loading} className="w-full h-14 bg-green-900 hover:bg-green-700 text-white rounded-xl font-bold">
              {loading ? (
                <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /><span className="uppercase text-[11px] tracking-wider animate-pulse">Aguarde, não saia desta tela!</span></div>
              ) : "Enviar Documentação Agora!"}
            </Button>
          </>
        )}
      </div>
    </form>
    </>
  );
};

export default FormularioSolicitacao;
