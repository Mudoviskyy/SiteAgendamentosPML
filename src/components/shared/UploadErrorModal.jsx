import React from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ILOVEPDF_URL = 'https://www.ilovepdf.com/pt/pdf_para_jpg';

/**
 * Modal de erro amigável para falhas no upload.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - errorMessage: string (mensagem técnica do erro, pode ser null)
 */
const UploadErrorModal = ({ isOpen, onClose, errorMessage }) => {
  if (!isOpen) return null;

  const hasPdfHint = !errorMessage ||
    errorMessage === '' ||
    /pdf|arquivo|file|compress|network|fetch|failed|quota|storage|size|type|mime/i.test(errorMessage);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.80)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-90 duration-200 relative">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone */}
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-900">
              Erro ao Enviar Documentos
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Houve uma falha ao processar ou enviar seus arquivos. Isso pode acontecer com arquivos PDF em alguns dispositivos.
            </p>
          </div>

          {/* Mensagem de erro técnica, se houver e for legível */}
          {errorMessage && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
              <p className="text-[11px] text-slate-500 font-mono break-words">{errorMessage}</p>
            </div>
          )}

          {/* Dica do iLovePDF */}
          {hasPdfHint && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
              <p className="text-sm font-bold text-amber-900">
                💡 Dica: Converta seu PDF para imagem
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Se você estava tentando enviar um arquivo <strong>PDF</strong>, tente convertê-lo para <strong>JPG</strong> antes de enviar novamente. Isso resolve a maioria dos problemas de compatibilidade em celulares.
              </p>
              <a
                href={ILOVEPDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-colors w-full justify-center"
              >
                <ExternalLink className="w-4 h-4" />
                Converter PDF para JPG (grátis)
              </a>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-200 text-slate-600 font-bold rounded-xl h-11"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadErrorModal;
