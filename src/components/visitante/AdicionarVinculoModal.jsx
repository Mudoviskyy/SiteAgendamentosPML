
import React, { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Info, X, FileText, AlertCircle, RefreshCcw, CheckCircle2, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { PARENTESCO_RULES } from '@/utils/parentescoRules';
import { carteirinhasService } from '@/services/carteirinhasService';
import { comprimirArquivo } from '@/pages/visitante/carteirinha/components/UploadDocumentos';
import ProcessingModal from '@/components/shared/ProcessingModal';
import UploadErrorModal from '@/components/shared/UploadErrorModal';
import { verificarMatriculaIPEN, normalizeCheck } from '@/services/visitanteService';

const FLUXOS = {
  NOVA: 'nova',
  RENOVACAO: 'renovacao',
  JA_TENHO: 'ja_tenho',
};

const AdicionarVinculoModal = ({ isOpen, onClose, user, profile, onSucesso }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [fluxo, setFluxo] = useState(null);
  const [parentesco, setParentesco] = useState('');
  const [nomePreso, setNomePreso] = useState('');
  const [matriculaPreso, setMatriculaPreso] = useState('');
  // Alerta IPEN: null = sem alerta | { nomeIPEN, nomeDigitado, pendingSubmit: fn }
  const [ipenAlerta, setIpenAlerta] = useState(null);
  const [files, setFiles] = useState([]);

  const selectedRule = PARENTESCO_RULES[parentesco];
  const matriculaObrigatoria = fluxo === FLUXOS.RENOVACAO || fluxo === FLUXOS.JA_TENHO;

  const resetForm = () => {
    setFluxo(null);
    setParentesco('');
    setNomePreso('');
    setMatriculaPreso('');
    setFiles([]);
    setIpenAlerta(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.size > 0);

    if (files.length + selectedFiles.length > 8) {
      toast({
        title: "Limite excedido",
        description: "Você pode enviar no máximo 8 arquivos por solicitação.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    const invalidSize = selectedFiles.filter(f => f.size > 5 * 1024 * 1024);
    if (invalidSize.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "Cada arquivo deve ter no máximo 5MB.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const invalidType = selectedFiles.filter(f => !allowedTypes.includes(f.type) && !f.name.toLowerCase().endsWith('.pdf'));
    if (invalidType.length > 0) {
      toast({
        title: "Formato inválido",
        description: "Envie apenas arquivos PDF, JPG ou PNG.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    // PDFs acima de 3MB podem travar celulares
    const heavyPdfs = selectedFiles.filter(f => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      return isPdf && f.size > 3 * 1024 * 1024;
    });
    if (heavyPdfs.length > 0) {
      toast({
        title: "PDF muito pesado",
        description: `PDFs acima de 3MB podem falhar no celular. Converta para JPG em ilovepdf.com antes de enviar.`,
        className: "bg-amber-500 text-white border-none"
      });
      e.target.value = '';
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Executa o upload efetivo após validações IPEN
  const executarSubmit = async (nomeParaEnviar) => {
    setLoading(true);
    setShowProcessing(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão ou converta PDFs para JPG e tente novamente.')), 90000)
      );

      const uploadPromise = (async () => {
        const compressedFiles = await Promise.all(files.map(comprimirArquivo));

        const dados = {
          nome: profile.nome_completo,
          cpf: profile.cpf,
          parentesco,
          nome_apenado: nomeParaEnviar.toUpperCase(),
          matricula_preso: matriculaPreso || null,
          telefone: profile.telefone,
          tipo_identificacao: profile.tipo_identificacao,
          tipo_telefone: profile.tipo_telefone,
          possui_carteirinha: fluxo === FLUXOS.JA_TENHO ? true : fluxo,
        };

        const documentos = { comprovante_parentesco: compressedFiles };
        return await carteirinhasService.createVinculo(dados, documentos, user.id);
      })();

      await Promise.race([uploadPromise, timeoutPromise]);

      toast({
        title: "Solicitação enviada!",
        description: "Seu pedido de vínculo foi encaminhado para análise.",
        className: "bg-[#2D5016] text-white border-none"
      });
      onSucesso?.();
      handleClose();
    } catch (error) {
      setUploadError(error.message || 'Erro desconhecido ao enviar.');
    } finally {
      setLoading(false);
      setShowProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!parentesco) {
      toast({ title: "Campo obrigatório", description: "Selecione o parentesco.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (!nomePreso.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome do interno.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (matriculaObrigatoria && (!matriculaPreso || matriculaPreso.length < 6)) {
      toast({ title: "Matrícula obrigatória", description: "Informe os 6 dígitos da matrícula para este tipo de solicitação.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (files.length === 0) {
      toast({ title: "Documentos obrigatórios", description: "Anexe pelo menos 1 documento comprobatório.", className: "bg-red-500 text-white border-none" });
      return;
    }

    // === VERIFICAÇÃO IPEN (somente quando matrícula é obrigatória e foi informada) ===
    if (matriculaObrigatoria && matriculaPreso.length === 6) {
      setLoading(true);
      const resultado = await verificarMatriculaIPEN(matriculaPreso);
      setLoading(false);

      if (resultado.erro) {
        // Falha de conexão – avisa mas não bloqueia
        toast({
          title: "Aviso: verificação indisponível",
          description: "Não foi possível verificar a matrícula agora. Revise os dados antes de continuar.",
          className: "bg-amber-500 text-white border-none",
          duration: 5000,
        });
        await executarSubmit(nomePreso);
        return;
      }

      if (!resultado.encontrado) {
        // Matrícula não encontrada na base IPEN
        toast({
          title: "Matrícula não encontrada",
          description: "Este número não consta na base IPEN. Verifique se a matrícula está correta na Carteirinha Oficial ou contate o Setor Social.",
          className: "bg-red-500 text-white border-none",
          duration: 8000,
        });
        return;
      }

      // Matrícula encontrada – verifica se o nome bate
      const nomeDigitadoNorm = normalizeCheck(nomePreso);
      if (nomeDigitadoNorm !== resultado.nomeNormalizado) {
        // Nome diverge: mostra alerta de confirmação
        setIpenAlerta({
          nomeIPEN: resultado.nome,
          nomeDigitado: nomePreso,
        });
        return;
      }

      // Nome OK – padroniza para o nome da base IPEN e envia
      await executarSubmit(resultado.nome);
      return;
    }

    // Sem validação IPEN (nova solicitação sem matrícula obrigatória)
    await executarSubmit(nomePreso);
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
    <Dialog open={!!ipenAlerta} onOpenChange={() => setIpenAlerta(null)}>
      <DialogContent className="sm:max-w-[460px] bg-white rounded-2xl border-0 shadow-2xl p-0">
        <DialogHeader className="p-6 pb-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
          <DialogTitle className="text-amber-800 flex items-center gap-2 text-base font-black uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-amber-600" /> Atenção: Nome Divergente
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            A matrícula informada foi localizada no IPEN, porém o <strong>nome do interno</strong> não corresponde ao cadastro oficial.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Nome digitado por você</p>
              <p className="font-mono font-bold text-red-900 text-sm">{ipenAlerta?.nomeDigitado?.toUpperCase()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Nome oficial no IPEN</p>
              <p className="font-mono font-bold text-green-900 text-sm">{ipenAlerta?.nomeIPEN}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Se o <strong>Nome Oficial do IPEN</strong> estiver correto, clique em <strong>"Usar nome do IPEN"</strong> para corrigir automaticamente. Caso contrário, volte e corrija a matrícula ou o nome antes de enviar.
            </p>
          </div>
        </div>
        <DialogFooter className="p-6 pt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIpenAlerta(null)}
            className="text-xs font-bold uppercase"
          >
            Voltar e Corrigir
          </Button>
          <Button
            onClick={async () => {
              const nome = ipenAlerta.nomeIPEN;
              setNomePreso(nome);
              setIpenAlerta(null);
              await executarSubmit(nome);
            }}
            disabled={loading}
            className="bg-[#2D5016] hover:bg-[#1f3810] text-white text-xs font-bold uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Usar Nome do IPEN e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-0 shadow-2xl p-0">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-[#2D5016] uppercase tracking-wider flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" /> Acrescentar Vínculo
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-medium text-slate-500">
            Vincule um novo detento à sua carteirinha ativa.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4">
          {/* ===== ETAPA 1: Seleção do Fluxo ===== */}
          {!fluxo ? (
            <div className="space-y-5">
              <h3 className="text-base font-black text-slate-800 text-center">Qual o seu caso?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setFluxo(FLUXOS.NOVA)}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-slate-200 rounded-2xl hover:border-[#2D5016] hover:bg-green-50/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-green-700" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 text-sm">1ª Via (Nova)</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Nunca tive vínculo com este interno</p>
                  </div>
                </button>

                <button
                  onClick={() => setFluxo(FLUXOS.RENOVACAO)}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-slate-200 rounded-2xl hover:border-[#2D5016] hover:bg-green-50/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <RefreshCcw className="w-6 h-6 text-green-700" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 text-sm">Renovação</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Meu vínculo anterior já venceu</p>
                  </div>
                </button>

                <button
                  onClick={() => setFluxo(FLUXOS.JA_TENHO)}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-slate-200 rounded-2xl hover:border-[#2D5016] hover:bg-green-50/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6 text-green-700" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 text-sm">Já Tenho</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Tenho vínculo ativo e quero sincronizar</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* ===== ETAPA 2: Formulário ===== */
            <div className="space-y-5 animate-in fade-in-50 slide-in-from-right-4 duration-300">
              {/* Header com botão Alterar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  {fluxo === FLUXOS.NOVA && <><FileText className="w-4 h-4 text-green-600" /> 1ª Via (Nova)</>}
                  {fluxo === FLUXOS.RENOVACAO && <><RefreshCcw className="w-4 h-4 text-green-600" /> Renovação</>}
                  {fluxo === FLUXOS.JA_TENHO && <><CheckCircle2 className="w-4 h-4 text-green-600" /> Já Tenho</>}
                </div>
                <button 
                  type="button" 
                  onClick={() => { setFluxo(null); setFiles([]); }}
                  className="text-xs font-bold text-slate-400 hover:text-[#2D5016] uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Alterar
                </button>
              </div>

              {/* Dados do Interno */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Nome do Interno *</Label>
                  <Input 
                    placeholder="NOME COMPLETO" 
                    value={nomePreso}
                    onChange={(e) => setNomePreso(e.target.value)}
                    className="uppercase bg-white border-slate-200 focus:border-[#2D5016]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">
                    Matrícula (6 dígitos) {matriculaObrigatoria ? '*' : '(Opcional)'}
                  </Label>
                  <Input 
                    placeholder="000000" 
                    value={matriculaPreso}
                    onChange={(e) => setMatriculaPreso(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="font-mono bg-white border-slate-200 focus:border-[#2D5016]"
                  />
                  {!matriculaObrigatoria && (
                    <p className="text-[10px] text-blue-600 font-medium">
                      Caso não saiba, pode deixar em branco. Será preenchido depois.
                    </p>
                  )}
                </div>
              </div>

              {/* Alerta de dados */}
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold text-red-900 leading-tight uppercase">
                    Atenção aos dados!
                  </p>
                  <p className="text-[10px] text-red-800 leading-relaxed font-medium">
                    O Nome e Matrícula devem estar corretos para não recusarem seu pedido. Consulte na <strong>Carteirinha Oficial do i-Pen</strong> ou entre em contato com o <strong>Setor Social</strong>.
                  </p>
                </div>
              </div>

              {/* Parentesco */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Parentesco com este Interno *</Label>
                <Select onValueChange={setParentesco} value={parentesco}>
                  <SelectTrigger className="bg-white border-slate-200 focus:border-[#2D5016]">
                    <SelectValue placeholder="SELECIONE O PARENTESCO" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" className="z-[100] bg-white">
                    {Object.keys(PARENTESCO_RULES).map(rule => (
                      <SelectItem key={rule} value={rule}>{rule}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instruções Dinâmicas */}
              {selectedRule && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-[10px] uppercase">
                    <Info className="w-3.5 h-3.5" /> Documentos Necessários para "{parentesco}":
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    {selectedRule.instructions}
                  </p>
                </div>
              )}

              {/* Upload de Arquivos */}
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Anexar Documentos (Máx 8 arquivos, 5MB cada) *</Label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-[#2D5016] cursor-pointer transition-all group">
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#2D5016]/10 transition-colors">
                      <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#2D5016]" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Clique para selecionar</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG ou PNG até 5MB</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>

                {/* Lista de Arquivos */}
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                      {files.length} arquivo{files.length > 1 ? 's' : ''} selecionado{files.length > 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 border border-green-100 p-2 px-3 rounded-lg text-[11px] group/file">
                          <span className="truncate max-w-[280px] font-medium text-slate-700">{file.name}</span>
                          <button 
                            onClick={() => removeFile(index)} 
                            className="text-slate-300 hover:text-red-500 transition-colors shrink-0 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Aviso de processamento */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                  Após clicar em enviar, aguarde. O sistema vai comprimir os arquivos e enviar com segurança.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        {fluxo && (
          <DialogFooter className="p-6 pt-0 flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={loading} className="uppercase text-[10px] font-bold text-slate-500">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="bg-[#2D5016] hover:bg-[#1f3810] text-white uppercase text-[10px] font-bold tracking-widest px-8 rounded-xl shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="animate-pulse">Enviando...</span>
                </div>
              ) : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdicionarVinculoModal;

