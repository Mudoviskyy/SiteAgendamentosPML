import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, FileUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Configuração do Worker do PDF.js (CDN para evitar problemas de build locais)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const ImportarPresosPDF = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const { toast } = useToast();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setStats(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + "\n";
      }

      const presos = parsearTexto(fullText);

      if (presos.length === 0) {
        throw new Error("Nenhum detento identificado no formato esperado.");
      }

      // 1. Limpar a base antiga para garantir que só fiquem os presos do PDF atual
      const { error: deleteError } = await supabase
        .from('base_pdf')
        .delete()
        .neq('matricula', 'void'); // Filtro genérico para selecionar todos os registros

      if (deleteError) throw deleteError;

      // 2. Enviar os novos dados (Insert)
      const { error } = await supabase
        .from('base_pdf')
        .insert(presos);

      if (error) throw error;

      setStats({ count: presos.length });
      toast({
        title: "Sucesso!",
        description: `${presos.length} detentos sincronizados com a base.`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Erro no processamento:", error);
      toast({
        title: "Erro ao processar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parsearTexto = (texto) => {
    // Portabilidade da lógica do Apps Script
    let bruto = String(texto || '');
    
    // Normalização básica de quebras de linha
    bruto = bruto.replace(/(GAL:\s*[A-Z])/g, '\n$1');
    bruto = bruto.replace(/(^|[^\d])(\d{6}\s+)/g, (match, p1, p2) => p1 + '\n' + p2);
    
    const linhas = bruto.split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const registros = [];
    let galeriaAtual = '';

    const ehLinhaAdministrativa = (l) => [
      /^ESTADO DE/i, /^SECRETARIA DE/i, /^POLICIA PENAL/i, /^SISTEMA DE/i,
      /^UNIDADE:/i, /^PRONTUARIOS/i, /^IMPRESSO EM/i, /^TOTAL /i, /^i-PEN/i
    ].some(rx => rx.test(l));

    const temCaraDeOcorrencia = (l) => {
      if (/[()|:/]/.test(l) && !l.includes('GAL:')) return true;
      if (/\d{2}\/\d{2}\/\d{4}/.test(l)) return true;
      return /\b(CONSULTA|SAIDA|TRABALHO|PUNICAO|PARLATORIO|PRIMEIRA|FASE)\b/i.test(l);
    };

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      // Detecta Galeria
      const matchGal = linha.match(/GAL:\s*([A-Z])/i);
      if (matchGal) {
        galeriaAtual = matchGal[1].toUpperCase();
        continue;
      }

      // Detecta Detento (Matrícula 6 dígitos + Nome)
      const matchPreso = linha.match(/^(\d{6})\s+(.+)$/);
      if (matchPreso && galeriaAtual) {
        const matricula = matchPreso[1];
        let nome = matchPreso[2];

        // Tenta capturar continuação do nome em linhas seguintes
        while (i + 1 < linhas.length) {
          const prox = linhas[i + 1];
          if (/^GAL:\s*[A-Z]/i.test(prox) || /^\d{6}\s+/.test(prox) || 
              ehLinhaAdministrativa(prox) || temCaraDeOcorrencia(prox)) break;
          
          nome += ' ' + prox;
          i++;
        }

        // Limpeza do nome
        nome = nome
          .replace(/\s+(CONSULTA|SAIDA|TRABALHO|PUNICAO|PARLATORIO|PRIMEIRA)\b.*$/i, '')
          .replace(/[^A-ZÀ-ÚÇ' -]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

        if (nome && nome.length > 3) {
          registros.push({
            matricula,
            nome,
            galeria: galeriaAtual
          });
        }
      }
    }

    // Remover duplicatas por matrícula
    const unique = [];
    const map = new Map();
    for (const item of registros) {
      if (!map.has(item.matricula)) {
        map.set(item.matricula, true);
        unique.push(item);
      }
    }
    return unique;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-dashed border-gray-400 hover:border-blue-500 hover:text-blue-600 transition-all">
          <FileUp size={16} />
          Sincronizar PDF (IPEN)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Sincronizar Base de Internos</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-sm text-gray-600 animate-pulse font-medium">Extraindo texto e validando dados...</p>
            </div>
          ) : stats ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <p className="text-sm font-bold text-gray-900">Sincronização Concluída!</p>
              <p className="text-xs text-gray-500">Foram processados e salvos <span className="text-gray-900 font-bold">{stats.count}</span> registros de internos.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-full">
                <FileUp className="text-blue-500" size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">Selecione o Relatório PDF</p>
                <p className="text-xs text-gray-500">O sistema processará matrículas, nomes e galerias automaticamente.</p>
              </div>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="pdf-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="pdf-upload">
                <Button asChild variant="default" className="bg-[#2D5016] hover:bg-[#1a310d]">
                  <span className="cursor-pointer">Escolher Arquivo</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex gap-2">
          <AlertTriangle className="text-amber-600 shrink-0" size={16} />
          <p className="text-[10px] text-amber-800 leading-relaxed">
            <strong>Aviso de Segurança:</strong> O processamento ocorre localmente no seu computador. Os dados são enviados de forma segura diretamente para o banco de dados Supabase da unidade.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportarPresosPDF;
