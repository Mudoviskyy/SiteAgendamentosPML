import React from 'react';
import { Upload, X, Check, CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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

const UploadDocsMenor = ({ id, label, descricao = "PNG, JPG ou PDF", file, handleFileChange, clearFile }) => {
  const { toast } = useToast();

  const onInputChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

    if (f.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `"${f.name}" excede 5MB. Converta para JPG em ilovepdf.com e tente novamente.`,
        className: "bg-red-500 text-white border-none"
      });
      e.target.value = "";
      return;
    }

    if (isPdf && f.size > 3 * 1024 * 1024) {
      toast({
        title: "PDF muito pesado",
        description: `PDFs acima de 3MB podem falhar no celular. Converta para JPG em ilovepdf.com antes de enviar.`,
        className: "bg-amber-500 text-white border-none"
      });
      e.target.value = "";
      return;
    }

    handleFileChange(id, e);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-semibold flex items-center gap-2">
        {label}
        {file && <Check className="w-4 h-4 text-green-600" />}
      </Label>
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          file ? "border-green-500 bg-green-50/50" : "border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/50 bg-slate-50"
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
          {file ? (
            <>
              <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
              <p className="text-sm font-bold text-green-700 truncate w-full max-w-[200px]">{file.name}</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium">Toque para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">{descricao}</p>
            </>
          )}
        </div>
        <input 
          id={id} 
          type="file" 
          className="hidden" 
          accept=".pdf,.jpg,.jpeg,.png" 
          onChange={onInputChange} 
        />
      </label>
      {file && (
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={() => clearFile(id)} 
          className="text-red-500 h-8 hover:text-red-700 hover:bg-red-50 w-fit"
        >
          <X className="w-4 h-4 mr-1" /> Remover Arquivo
        </Button>
      )}
    </div>
  );
};

export default UploadDocsMenor;
