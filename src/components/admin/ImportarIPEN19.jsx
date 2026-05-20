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
// Este arquivo importa presos para que a aba agendamentos e carteriinhas possam levar ao admin a certeza que as matriculas
// digitadas pelos visitantes realmente são validas
// Configuração do Worker do PDF.js (CDN para evitar problemas de build locais)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const ImportarIPEN19 = ({ onComplete }) => {
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

      // Utilizando UPSERT na base_pdf com base na matrícula
      const { error } = await supabase
        .from('base_pdf')
        .upsert(presos, { onConflict: 'matricula' });

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
    let bruto = String(texto || '');

    const linhas = bruto.split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const registros = [];

    // Regex para extrair do relatório 1.9:
    // Exemplo: 647126 THIAGO STEFANES TRABALHO INTERNO 03/11/2014 M C A 1 Oficina 1
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const match = linha.match(/^(\d{6})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([M|F])\s+([A-Z0-9])/i);

      if (match) {
        const matricula = match[1];
        let nomeSituacao = match[2];
        const dataStr = match[3]; // DD/MM/YYYY
        // const ala = match[4];
        const galeria = match[5].toUpperCase();

        // Limpeza do nome - remover a situação que fica grudada no final
        let nome = nomeSituacao
          .replace(/\s+(TRABALHO INTERNO|TRABALHO EXTERNO|RECOLHIDO\(A\)|SEMIABERTO|ABERTO|LIVRAMENTO CONDICIONAL|INTERNADO|ALBERGADO|NÃO INFORMADO|PROVISORIO|CONDENADO|REGIME ESPECIAL).*$/i, '')
          .replace(/[^A-ZÀ-ÚÇ' -]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

        // Converte DD/MM/YYYY para YYYY-MM-DD
        const [dia, mes, ano] = dataStr.split('/');
        const data_ingresso = `${ano}-${mes}-${dia}`;

        if (nome && nome.length > 3) {
          registros.push({
            matricula,
            nome,
            galeria,
            data_ingresso
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
        <Button variant="outline" className="flex items-center gap-2 border-dashed border-[#2D5016] hover:border-green-600 hover:text-green-700 transition-all">
          <FileUp size={16} />
          Sincronizar PDF (1.9)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Sincronizar Relatório 1.9 (Data de Ingresso)</DialogTitle>
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

export default ImportarIPEN19;
