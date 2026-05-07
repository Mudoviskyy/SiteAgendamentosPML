import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, AlertTriangle, BadgeInfo, UserSquare2,
  RefreshCcw, FileText, CheckCircle2
} from 'lucide-react';
import { carteirinhasService } from '@/services/carteirinhasService';
import UploadDocsMenor, { comprimirArquivo } from './UploadDocsMenor';
import ProcessingModal from '@/components/shared/ProcessingModal';
import UploadErrorModal from '@/components/shared/UploadErrorModal';

const TIPOS_IDENTIFICACAO = { CPF: 'CPF', ESTRANGEIRO: 'Documento Estrangeiro' };

const FormularioMenor = ({ user, profile, carteirinhasAprovadas, fluxoAtivo, setFluxoAtivo }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [tipoIdentificacao, setTipoIdentificacao] = useState(TIPOS_IDENTIFICACAO.CPF);
  const [documentoValor, setDocumentoValor] = useState("");

  const [formData, setFormData] = useState({
    nome_menor: '',
    cpf_menor: '',
    parentesco: '',
    nome_apenado: '',
    matricula_preso: '',
    prontuario_menor: '',
  });

  const [documentos, setDocumentos] = useState({
    foto_3x4: null,
    responsavel_rg_frente: null,
    responsavel_rg_verso: null,
    menor_rg_frente: null,
    menor_rg_verso: null,
    certidao_nascimento: null,
    declaracao_vacina: null,
    documento_autorizacao_legal: null,
    carteirinha_oficial: null,
  });

  const [dataEmissao, setDataEmissao] = useState({ dia: '', mes: '', ano: '' });
  const [dataNascimento, setDataNascimento] = useState({ dia: '', mes: '', ano: '' });

  const dias = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const meses = [
    { v: "01", l: "Jan" }, { v: "02", l: "Fev" }, { v: "03", l: "Mar" },
    { v: "04", l: "Abr" }, { v: "05", l: "Mai" }, { v: "06", l: "Jun" },
    { v: "07", l: "Jul" }, { v: "08", l: "Ago" }, { v: "09", l: "Set" },
    { v: "10", l: "Out" }, { v: "11", l: "Nov" }, { v: "12", l: "Dez" }
  ];

  const anoAtual = new Date().getFullYear();
  const anosEmissao = [anoAtual.toString(), (anoAtual - 1).toString(), (anoAtual - 2).toString(), (anoAtual - 3).toString()];
  const anosMenor = Array.from({ length: 19 }, (_, i) => (anoAtual - i).toString());

  useEffect(() => {
    if (profile) {
      setTipoIdentificacao(profile.tipo_identificacao || TIPOS_IDENTIFICACAO.CPF);
      let val = profile.cpf || "";
      if (profile.tipo_identificacao === TIPOS_IDENTIFICACAO.CPF) {
        let t = val.replace(/\D/g, '');
        if (t.length > 11) t = t.slice(0, 11);
        val = t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if (t.length < 11) val = profile.cpf;
      }
      setDocumentoValor(val);
    }
  }, [profile]);

  const handleFileChange = async (tipo, e) => {
    const file = e.target.files[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      if (!isImage && file.type !== 'application/pdf') {
        toast({ title: "Formato inválido", description: "Envie apenas imagens (JPG/PNG) ou PDF.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O tamanho máximo permitido é 5MB.", variant: "destructive" });
        return;
      }
      setDocumentos(prev => ({ ...prev, [tipo]: file }));
    }
  };

  const clearFile = (tipo) => {
    setDocumentos(prev => ({ ...prev, [tipo]: null }));
  };

  const validarFormulario = () => {
    if (!formData.nome_menor?.trim()) return "Nome do menor é obrigatório.";
    if (!dataNascimento.dia || !dataNascimento.mes || !dataNascimento.ano) return "Data de nascimento do menor é obrigatória.";
    if (!formData.parentesco?.trim()) return "Selecione o seu parentesco com o menor.";
    if (!formData.nome_apenado?.trim()) return "Nome do detento é obrigatório.";

    if (fluxoAtivo === 'ja_tenho') {
      if (!dataEmissao.dia || !dataEmissao.mes || !dataEmissao.ano) return "Data de emissão da carteirinha é obrigatória.";
      if (!documentos.carteirinha_oficial) return "É obrigatório anexar a Carteirinha Oficial.";
    } else {
      if (!documentos.foto_3x4) return "A foto 3x4 do menor é obrigatória.";
      if (!documentos.responsavel_rg_frente) return "A frente do RG/CPF do responsável é obrigatória.";
      if (!documentos.responsavel_rg_verso) return "O verso do RG/CPF do responsável é obrigatório.";
      if (!documentos.menor_rg_frente) return "A frente do RG do menor é obrigatória.";
      if (!documentos.menor_rg_verso) return "O verso do RG do menor é obrigatório.";
      if (!documentos.certidao_nascimento) return "A certidão de nascimento do menor é obrigatória.";
      if (!documentos.declaracao_vacina) return "A declaração de vacina é obrigatória.";
      if (formData.parentesco === 'Autorização Judicial' && !documentos.documento_autorizacao_legal) {
        return "A Autorização Judicial / Guarda é obrigatória para este parentesco.";
      }
      if (fluxoAtivo === 'renovacao' && !formData.prontuario_menor?.trim()) {
        return "O prontuário da carteirinha anterior do menor é obrigatório na renovação.";
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erro = validarFormulario();
    if (erro) { toast({ title: "Atenção", description: erro, variant: "destructive" }); return; }

    setIsSubmitting(true);
    setShowProcessing(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão ou converta PDFs para JPG e tente novamente.')), 90000)
      );

      const uploadPromise = (async () => {
        let dataFinalEmissao = null;
        if (fluxoAtivo === 'ja_tenho') {
          dataFinalEmissao = `${dataEmissao.ano}-${dataEmissao.mes}-${dataEmissao.dia}`;
        }

        const docClean = tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF ? documentoValor.replace(/\D/g, "") : documentoValor.trim();

        const payload = {
          nome: profile.nome,
          cpf: docClean,
          tipo_identificacao: tipoIdentificacao,
          tipo_telefone: profile.tipo_telefone || 'BR',
          telefone: profile.telefone || '',
          parentesco: formData.parentesco,
          nome_apenado: formData.nome_apenado,
          matricula_preso: formData.matricula_preso || 'PENDENTE',
          possui_carteirinha: fluxoAtivo === 'novo' ? 'nova' : (fluxoAtivo === 'ja_tenho' ? true : 'renovacao'),
          nome_menor: formData.nome_menor,
          data_nascimento_menor: `${dataNascimento.ano}-${dataNascimento.mes}-${dataNascimento.dia}`,
          cpf_menor: formData.cpf_menor,
        };

        const compressedDocs = {};
        for (const [key, file] of Object.entries(documentos)) {
          if (file) {
            compressedDocs[key] = await comprimirArquivo(file);
          }
        }

        return await carteirinhasService.createCarteirinhaMenor(
          payload,
          compressedDocs,
          user.id,
          dataFinalEmissao
        );
      })();

      const { success, protocol } = await Promise.race([uploadPromise, timeoutPromise]);

      if (success) {
        toast({ title: "Solicitação Enviada!", description: `Protocolo: ${protocol}`, className: "bg-green-600 text-white" });
        setTimeout(() => navigate('/painel'), 2000);
      }
    } catch (error) {
      setUploadError(error.message || 'Erro desconhecido ao enviar.');
    } finally {
      setIsSubmitting(false);
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {fluxoAtivo === 'novo' && <><FileText className="w-5 h-5 text-cyan-500" /> Nova Carteirinha (1ª Via)</>}
          {fluxoAtivo === 'renovacao' && <><RefreshCcw className="w-5 h-5 text-cyan-500" /> Renovação da Carteirinha</>}
          {fluxoAtivo === 'ja_tenho' && <><CheckCircle2 className="w-5 h-5 text-cyan-500" /> Sincronizar Existente</>}
        </h3>
        <Button type="button" variant="ghost" onClick={() => setFluxoAtivo(null)} className="text-slate-500 h-8 px-2 text-xs font-bold uppercase tracking-wider">
          Alterar
        </Button>
      </div>

      {/* DADOS DO RESPONSÁVEL E CONTATO */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-wider">Responsável pelo Menor</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold text-red-600">Você é o que do Menor? *</Label>
            <Select value={formData.parentesco} onValueChange={(v) => setFormData({ ...formData, parentesco: v })}>
              <SelectTrigger className="bg-white border-slate-200">
                <SelectValue placeholder="Selecione o parentesco" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Pai">Pai</SelectItem>
                <SelectItem value="Mãe">Mãe</SelectItem>
                <SelectItem value="Autorização Judicial">Autorização Judicial / Guarda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* DADOS DO MENOR */}
      <div className="space-y-6 bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100">
        <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-2">
          <UserSquare2 className="w-4 h-4" /> Dados do Menor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold text-red-600">Nome Completo do Menor *</Label>
            <Input
              value={formData.nome_menor}
              onChange={(e) => setFormData({ ...formData, nome_menor: e.target.value.toUpperCase() })}
              placeholder="NOME COMPLETO"
              className="uppercase bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 font-bold"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold text-red-600">Data de Nascimento *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={dataNascimento.dia} onValueChange={(v) => setDataNascimento({ ...dataNascimento, dia: v })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Dia" /></SelectTrigger>
                <SelectContent className="bg-white h-64">{dias.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dataNascimento.mes} onValueChange={(v) => setDataNascimento({ ...dataNascimento, mes: v })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent className="bg-white h-64">{meses.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dataNascimento.ano} onValueChange={(v) => setDataNascimento({ ...dataNascimento, ano: v })}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent className="bg-white h-64">{anosMenor.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold">
              {tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF ? "CPF do Menor (Opcional)" : "Identificação do Menor (Opcional)"}
            </Label>
            <Input
              value={formData.cpf_menor}
              onChange={(e) => {
                if (tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF) {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 11) val = val.slice(0, 11);
                  val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  setFormData({ ...formData, cpf_menor: val });
                } else {
                  setFormData({ ...formData, cpf_menor: e.target.value.toUpperCase().slice(0, 20) });
                }
              }}
              placeholder={tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF ? "000.000.000-00" : "Nº do Documento do Menor"}
              className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 font-mono"
            />
          </div>
          {fluxoAtivo === 'renovacao' && (
            <div className="space-y-2">
              <Label className="text-slate-600 font-bold text-red-600 flex items-center gap-2">
                Prontuário da Carteirinha (Menor) *
                <BadgeInfo className="w-4 h-4 text-slate-400" />
              </Label>
              <Input
                value={formData.prontuario_menor}
                onChange={(e) => setFormData({ ...formData, prontuario_menor: e.target.value.replace(/\D/g, '') })}
                placeholder="Somente os 6 números"
                maxLength={6}
                className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 font-mono"
              />
              <p className="text-xs text-slate-500">Exigido para renovação (presente na carteirinha vencida).</p>
            </div>
          )}
        </div>
      </div>

      {/* VÍNCULO CARCERÁRIO */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-wider">Vínculo Carcerário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold text-red-600">Nome do Detento *</Label>
            {carteirinhasAprovadas.length > 0 ? (
              <Select
                value={formData.nome_apenado}
                onValueChange={(val) => {
                  const c = carteirinhasAprovadas.find(x => x.nome_apenado === val);
                  setFormData(prev => ({ ...prev, nome_apenado: val, matricula_preso: c?.matricula_preso || '' }));
                }}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o detento" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {carteirinhasAprovadas.map(c => (
                    <SelectItem key={c.nome_apenado} value={c.nome_apenado}>
                      {c.nome_apenado} {c.matricula_preso && `(${c.matricula_preso})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.nome_apenado}
                onChange={(e) => setFormData({ ...formData, nome_apenado: e.target.value.toUpperCase() })}
                placeholder="NOME COMPLETO DO DETENTO"
                className="uppercase bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 font-bold text-red-600 flex items-center gap-2">
              Matrícula do Detento (IPEN) *
              <BadgeInfo className="w-4 h-4 text-slate-400" />
            </Label>
            <Input
              value={formData.matricula_preso}
              onChange={(e) => setFormData({ ...formData, matricula_preso: e.target.value.replace(/\D/g, '') })}
              placeholder="Somente os 6 números"
              maxLength={6}
              className="bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* DOCUMENTAÇÃO */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" /> Envio de Documentos
        </h3>

        {fluxoAtivo === 'ja_tenho' ? (
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <h4 className="text-blue-800 font-bold m-0 leading-none">Instruções para Sincronização</h4>
              </div>
              <p className="text-blue-700 text-sm ml-6">
                Envie uma foto legível da carteirinha oficial do menor. Informe a data de emissão impressa nela para o cálculo da validade (2 anos).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadDocsMenor
                id="carteirinha_oficial"
                label="Carteirinha Oficial (Menor) *"
                descricao="Frente e Verso se possível"
                file={documentos.carteirinha_oficial}
                handleFileChange={handleFileChange}
                clearFile={clearFile}
              />

              <div className="space-y-4">
                <Label className="text-slate-600 font-bold text-red-600">Data de Emissão (Consta na Carteirinha) *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={dataEmissao.dia} onValueChange={(v) => setDataEmissao({ ...dataEmissao, dia: v })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Dia" /></SelectTrigger>
                    <SelectContent className="bg-white h-64">{dias.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={dataEmissao.mes} onValueChange={(v) => setDataEmissao({ ...dataEmissao, mes: v })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent className="bg-white h-64">{meses.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={dataEmissao.ano} onValueChange={(v) => setDataEmissao({ ...dataEmissao, ano: v })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Ano" /></SelectTrigger>
                    <SelectContent className="bg-white">{anosEmissao.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UploadDocsMenor id="foto_3x4" label="Foto 3x4 do Menor *" descricao="Fundo branco, rosto nítido" file={documentos.foto_3x4} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="responsavel_rg_frente" label="Seu RG (Frente) *" descricao="Documento do Responsável" file={documentos.responsavel_rg_frente} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="responsavel_rg_verso" label="Seu RG (Verso) *" descricao="Documento do Responsável" file={documentos.responsavel_rg_verso} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="menor_rg_frente" label="RG do Menor (Frente) *" descricao="Documento do Menor" file={documentos.menor_rg_frente} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="menor_rg_verso" label="RG do Menor (Verso) *" descricao="Documento do Menor" file={documentos.menor_rg_verso} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="certidao_nascimento" label="Certidão de Nascimento *" descricao="Documento do Menor" file={documentos.certidao_nascimento} handleFileChange={handleFileChange} clearFile={clearFile} />
            <UploadDocsMenor id="declaracao_vacina" label="Declaração de Vacina *" descricao="Emissão recente" file={documentos.declaracao_vacina} handleFileChange={handleFileChange} clearFile={clearFile} />

            {formData.parentesco === 'Autorização Judicial' && (
              <div className="md:col-span-2 border-2 border-cyan-200 rounded-xl p-4 bg-cyan-50/30">
                <UploadDocsMenor id="documento_autorizacao_legal" label="Autorização Judicial / Guarda *" descricao="Obrigatório para este tipo de parentesco" file={documentos.documento_autorizacao_legal} handleFileChange={handleFileChange} clearFile={clearFile} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Processamento Seguro de Arquivos</h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            Ao enviar para análise, seus arquivos serão convertidos e otimizados automaticamente antes de serem enviados aos nossos servidores. Este processo ocorre no seu dispositivo para economizar dados e garantir que as fotos mantenham a qualidade necessária para a confecção da carteirinha (limite de 5MB por arquivo, aceitamos JPG, PNG e PDF).
          </p>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => navigate('/painel')} className="h-12 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-200 transition-all uppercase tracking-wider text-sm">
          {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando Solicitação...</> : "Enviar para Análise"}
        </Button>
      </div>
    </form>
    </>
  );
};

export default FormularioMenor;
