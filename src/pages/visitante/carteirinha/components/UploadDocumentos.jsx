import React from 'react';
import { CheckCircle, Upload, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import imageCompression from 'browser-image-compression';
import { useToast } from '@/components/ui/use-toast';

// Comprime imagens antes do envio (PDFs são ignorados)
export const comprimirArquivo = async (file) => {
  if (!file) return file;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    return file;
  }

  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, { type: file.type });
  } catch (error) {
    console.error("Erro na compressão:", error);
    return file;
  }
};

const UploadDocumentos = ({ doc, isRequired, documentosState, handleFileSelect, clearFile, setOpenExampleVacina, obterInstrucaoParentesco }) => {
  const { toast } = useToast();
  const files = documentosState[doc.name];
  const hasFiles = files && files.length > 0;

  const onFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const oversizedFiles = selectedFiles.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: `"${oversizedFiles[0].name}" excede 5MB. Converta para JPG em ilovepdf.com e tente novamente.`,
        className: "bg-red-500 text-white border-none"
      });
      e.target.value = "";
      handleFileSelect({ target: { files: [] } }, doc.name);
      return;
    }

    // PDFs acima de 3MB podem travar celulares — bloquear preventivamente
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
      e.target.value = "";
      handleFileSelect({ target: { files: [] } }, doc.name);
      return;
    }

    handleFileSelect(e, doc.name);
  };


  return (
    <div key={doc.name} className="relative group space-y-1">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold text-slate-700">
          {doc.label} {isRequired && "*"}
        </Label>
        {doc.name === "declaracao_vacina" && (
          <button
            type="button"
            onClick={() => setOpenExampleVacina(true)}
            className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-0.5 rounded font-bold transition z-20"
          >
            Ver exemplo da DECLARAÇÃO DE VACINA!
          </button>
        )}
      </div>

      <input
        type="file"
        id={doc.name}
        name={doc.name}
        multiple={doc.multiple}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={onFileChange}
      />
      <label
        htmlFor={doc.name}
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${hasFiles ? "border-green-500 bg-green-50/50" : "border-slate-300 hover:border-[#2D5016] hover:bg-[#2D5016]/5 bg-slate-50"
          }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
          {hasFiles ? (
            <>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-bold text-green-700 break-all line-clamp-1 px-2">
                {files.length === 1 ? files[0].name : `${files.length} arquivos selecionados`}
              </p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#2D5016]/10 transition-colors">
                <Upload className="w-5 h-5 text-slate-500 group-hover:text-[#2D5016]" />
              </div>
              <p className="text-sm font-bold text-slate-700">Clique para enviar</p>
              <p className="text-xs text-slate-500 mt-1">{doc.multiple ? "Pode enviar mais de um arquivo" : "Envie o arquivo"}</p>
            </>
          )}
        </div>
        {hasFiles && (
          <button
            type="button"
            onClick={(e) => clearFile(e, doc.name)}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </label>
      {doc.name === "declaracao_residencia" && (
        <p className="text-[11px] text-gray-500 mt-1">
          Envie este documento apenas se o comprovante de residência não estiver em seu nome.
        </p>
      )}
      {doc.name === "comprovante_parentesco" && (
        <p className="text-[11px] text-gray-500 mt-1">
          {obterInstrucaoParentesco()}
        </p>
      )}
    </div>
  );
};

export default UploadDocumentos;