import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, FileSearch, AlertCircle, CheckCircle, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const AnalisarIPENModal = ({ agendamentosDoDia, onAnaliseComplete }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dataEmissao, setDataEmissao] = useState('');
  const { toast } = useToast();

  const parseVisitantesPDF = (textRaw) => {
    const lines = textRaw.split('\n').map(l => l.trim()).filter(l => l !== '');
    const data = [];
    
    let currentReeducando = null;
    let lastVisitorName = null;

    const vinculosPermitidos = [
        "Pai", "Mãe", "Filho(a)", "Filho (a)", "Irmão(ã)", "Irmão (ã)", 
        "Amigo(a)", "Amigo (a)", "Esposo(a)", "Companheiro(a)", 
        "Tio(a)", "Avô(ó)", "Advogado(a)", "Ex-Esposo(a)", "Representante Legal"
    ];

    lines.forEach(line => {
        const reeducandoMatch = line.match(/^(\d{6})\s+([A-Z\s]+)$/);
        
        if (reeducandoMatch) {
            currentReeducando = {
                matricula: reeducandoMatch[1],
                nome: reeducandoMatch[2].trim(),
                visitantes: []
            };
            data.push(currentReeducando);
            lastVisitorName = null;
            return;
        }

        if (line.includes("Galeria:") || line.includes("Bloco:") || line.includes("Residência:")) {
            return;
        }

        const vinculoEncontrado = vinculosPermitidos.find(v => 
            line.toLowerCase().includes(v.toLowerCase())
        );

        if (vinculoEncontrado && lastVisitorName && currentReeducando) {
            const idx = currentReeducando.visitantes.findIndex(v => v.nome === lastVisitorName);
            if (idx !== -1) {
                currentReeducando.visitantes[idx].vinculo = vinculoEncontrado;
            }
            return;
        }

        const visitorMatch = line.match(/(?:\d{5,6}\s+)?([A-Z\s]{10,})/);
        if (visitorMatch && currentReeducando) {
            const nomeVisitante = visitorMatch[1].trim();
            if (nomeVisitante !== currentReeducando.nome) {
                lastVisitorName = nomeVisitante;
                currentReeducando.visitantes.push({
                    nome: nomeVisitante,
                    vinculo: "Não identificado"
                });
            }
        }
    });

    const flatRows = [];
    data.forEach(r => {
        r.visitantes.forEach(v => {
           const normName = v.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
           flatRows.push({
              matricula_preso: r.matricula,
              nome_preso: r.nome,
              nome_visitante: v.nome,
              nome_visitante_normalizado: normName,
              vinculo: v.vinculo,
              data_visita: dataEmissao
           });
        });
    });

    return flatRows;
  };

  const processFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let pageText = "";
        for (let item of textContent.items) {
          pageText += item.str;
          if (item.hasEOL) pageText += '\n';
        }
        fullText += pageText + "\n";
      }

      return fullText;
    } catch (e) {
       throw new Error("Erro de manipulação do PDF. Veja se ele é um PDF de texto válido.");
    }
  }

  const handleFileUpload = async (event) => {
    if (!dataEmissao) {
       toast({
         title: "Data Obrigatória",
         description: "Por favor, selecione a Data de Emissão (Data da Visita) antes de fazer o upload do PDF.",
         variant: "destructive"
       });
       // Resets input value
       event.target.value = '';
       return;
    }

    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      // 1. Extração linha a linha
      const fullText = await processFile(file);
      
      // 2. Transforma as linhas em Matriz de Visitantes
      const parsedRows = parseVisitantesPDF(fullText);

      if (parsedRows.length === 0) {
        throw new Error("Não foi possível identificar registros com o formato IPEN esperado.");
      }

      // 3. Deleta registros anteriores (LIMPEZA TOTAL para substituição completa por base fidedigna)
      const { error: delError } = await supabase
        .from('base_visitantes_ipen')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Limpa tudo
      if (delError) throw delError;

      // Dividir inserção em lotes se for muito grande
      const batchSize = 1000;
      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize);
        const { error: insError } = await supabase.from('base_visitantes_ipen').insert(batch);
        if (insError) throw insError;
      }

      // 4. Executa a Lógica Imediata de Exibição do "Resumo"
      // Pegar os agendamentos já filtrados do dia e conferir quem faltou (agora com a lógica aprimorada baseada no banco/memória)
      let faltasCount = 0;
      let presencasCount = 0;
      const faltosos = [];

      agendamentosDoDia.forEach(agendamento => {
        const nomeVisitante = agendamento.visitante1_nome ? 
          agendamento.visitante1_nome.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : '';
          
        if (!nomeVisitante) return;
        
        // Compara com as rows persistidas
        const visitanteNoPDF = parsedRows.find(pr =>
           pr.nome_visitante_normalizado.includes(nomeVisitante) || 
           (agendamento.visitante1_carteirinha && fullText.includes(agendamento.visitante1_carteirinha))
        );

        if (visitanteNoPDF) {
          presencasCount++;
        } else {
          faltasCount++;
          faltosos.push(agendamento);
        }
      });

      toast({
        title: "Base Atualizada!",
        description: `Salvos ${parsedRows.length} visitantes para o dia ${dataEmissao.split('-').reverse().join('/')}. Achamos ${presencasCount} presenças na tela atual.`,
      });
      
      if (onAnaliseComplete) onAnaliseComplete({ faltasCount, presencasCount, faltosos });
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-dashed border-red-300 hover:border-red-500 hover:text-red-600 transition-all">
          <FileSearch size={16} />
          Analisar Faltas (IPEN PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Comparar IPEN x Agendamentos Portal</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="animate-spin text-red-500" size={32} />
              <p className="text-sm text-gray-600 animate-pulse font-medium">Extraindo texto, formatando e subindo pro banco de dados...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center w-full">
              <div className="bg-red-50 p-3 rounded-full">
                <FileSearch className="text-red-500" size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">Guia de Visitantes (IPEN)</p>
                <p className="text-xs text-gray-500 mb-2">Informe de que dia é a lista de visitantes do IPEN e depois anexe o PDF gerado pelo sistema para extrair as FALTAS permanentemente.</p>
              </div>

              <div className="w-full flex flex-col gap-2 my-2 text-left">
                 <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                   <CalendarDays size={14}/>
                   Data referente à lista (Dia da Visita)
                 </label>
                 <Input 
                   type="date" 
                   className="h-10 border-gray-300"
                   value={dataEmissao}
                   onChange={e => setDataEmissao(e.target.value)}
                 />
              </div>

              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="ipen-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="ipen-upload" className="mt-2 w-full">
                <Button asChild variant="default" className="bg-red-600 hover:bg-red-700 w-full" disabled={!dataEmissao}>
                  <span className={`cursor-pointer text-white ${!dataEmissao ? 'opacity-50' : ''}`}>Carregar IPEN e Gravar no Banco</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalisarIPENModal;
