
import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, FileText, AlertCircle, X, Clock, ShieldAlert, Heart, Lock, User, Hash
} from 'lucide-react';
import { carteirinhasService } from '@/services/carteirinhasService';
import { comprimirArquivo } from '@/pages/visitante/carteirinha/components/UploadDocumentos';
import ProcessingModal from '@/components/shared/ProcessingModal';
import UploadErrorModal from '@/components/shared/UploadErrorModal';

const AlterarParentescoModal = ({ isOpen, onClose, user, profile, masterCard, onSucesso }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [file, setFile] = useState(null);

  const resetForm = () => {
    setFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected || selected.size === 0) return;

    if (selected.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const isValidType = allowedTypes.includes(selected.type) || selected.name.toLowerCase().endsWith('.pdf');
    if (!isValidType) {
      toast({
        title: "Formato inválido",
        description: "Envie apenas PDF, JPG ou PNG.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    const isPdf = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
    if (isPdf && selected.size > 3 * 1024 * 1024) {
      toast({
        title: "PDF muito pesado",
        description: "PDFs acima de 3MB podem falhar no celular. Converta para JPG em ilovepdf.com antes de enviar.",
        className: "bg-amber-500 text-white border-none"
      });
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Documento obrigatório",
        description: "Anexe a certidão de casamento ou escritura pública de união estável.",
        className: "bg-red-500 text-white border-none"
      });
      return;
    }

    setLoading(true);
    setShowProcessing(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão ou converta PDFs para JPG e tente novamente.')), 90000)
      );

      const uploadPromise = (async () => {
        const comprimido = await comprimirArquivo(file);
        await carteirinhasService.createSolicitacaoAlteracaoParentesco(
          {
            nome: profile.nome_completo,
            cpf: profile.cpf,
            nome_apenado: masterCard.nome_apenado,
            matricula_preso: masterCard.matricula_preso,
            telefone: profile.telefone,
            tipo_identificacao: profile.tipo_identificacao,
            tipo_telefone: profile.tipo_telefone,
            parentesco_atual: masterCard.parentesco,
            parentesco_solicitado: 'esposo(a)',
          },
          comprimido,
          user.id
        );
      })();

      await Promise.race([uploadPromise, timeoutPromise]);

      toast({
        title: "Solicitação enviada!",
        description: "Seu pedido de alteração de parentesco foi encaminhado para análise.",
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

  return (
    <>
      <ProcessingModal isOpen={showProcessing} />
      <UploadErrorModal
        isOpen={uploadError !== null}
        onClose={() => setUploadError(null)}
        errorMessage={uploadError}
      />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-0 shadow-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
            <DialogTitle className="text-rose-700 uppercase tracking-wider flex items-center gap-2 text-base font-black">
              <Heart className="w-5 h-5 text-rose-500" /> Solicitar Alteração de Parentesco
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-rose-600/80 uppercase">
              Atualização de amigo(a) para esposo(a)
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5">

            {/* Dados imutáveis */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dados da Solicitação (não editáveis)</p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-200 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Visitante (você)</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{profile?.nome_completo}</p>
                  </div>
                  <Lock className="w-3 h-3 text-slate-300 ml-auto mt-1 shrink-0" />
                </div>

                <div className="border-t border-slate-100" />

                <div className="flex items-start gap-3">
                  <div className="bg-slate-200 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Detento vinculado</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{masterCard?.nome_apenado}</p>
                  </div>
                  <Lock className="w-3 h-3 text-slate-300 ml-auto mt-1 shrink-0" />
                </div>

                {masterCard?.matricula_preso && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-200 p-1.5 rounded-lg mt-0.5 shrink-0">
                        <Hash className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Matrícula</p>
                        <p className="text-sm font-black font-mono text-slate-900">{masterCard?.matricula_preso}</p>
                      </div>
                      <Lock className="w-3 h-3 text-slate-300 ml-auto mt-1 shrink-0" />
                    </div>
                  </>
                )}
              </div>

              {/* Alteração sendo solicitada */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-rose-400 tracking-wider mb-1">Alteração solicitada</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-500 uppercase line-through">{masterCard?.parentesco}</span>
                    <span className="text-rose-500 font-black">→</span>
                    <span className="text-sm font-black text-rose-700 uppercase">esposo(a)</span>
                  </div>
                </div>
                <Heart className="w-6 h-6 text-rose-400" />
              </div>
            </div>

            {/* Aviso de documento */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase">
                <FileText className="w-3.5 h-3.5" /> Documento Necessário
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                Envie a <strong>Certidão de Casamento</strong> ou a <strong>Escritura Pública de União Estável</strong> (1 arquivo, máx. 5MB). Apenas PDF, JPG ou PNG.
              </p>
            </div>

            {/* Aviso Google Drive */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-red-700 mb-0.5">Não use Google Drive ou links!</p>
                <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                  Envie o arquivo diretamente do seu dispositivo. Links compartilhados e arquivos do Google Drive <strong>não são aceitos</strong> pelo sistema.
                </p>
              </div>
            </div>

            {/* Upload */}
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Anexar Documento *</Label>

              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-rose-200 rounded-xl bg-rose-50/50 hover:bg-rose-100/50 hover:border-rose-400 cursor-pointer transition-all group">
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-rose-200 transition-colors">
                      <FileText className="w-5 h-5 text-rose-500 group-hover:text-rose-600" />
                    </div>
                    <p className="text-xs text-rose-600 font-bold">Clique para selecionar</p>
                    <p className="text-[10px] text-rose-400 mt-0.5">PDF, JPG ou PNG até 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-100 p-3 px-4 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-700 truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Aviso de processamento */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                Após clicar em enviar, aguarde. O sistema vai comprimir o arquivo e enviar com segurança. <strong>Não feche a tela.</strong>
              </p>
            </div>

            {/* Aviso sobre data de emissão */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                Quando aprovada, <strong>apenas o parentesco será atualizado</strong>. A data de emissão, validade e demais dados da sua carteirinha <strong>permanecerão inalterados</strong>.
              </p>
            </div>

          </div>

          <DialogFooter className="p-6 pt-0 flex gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
              className="uppercase text-[10px] font-bold text-slate-500"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white uppercase text-[10px] font-bold tracking-widest px-8 rounded-xl shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="animate-pulse">Enviando...</span>
                </div>
              ) : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlterarParentescoModal;
