import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, CheckCircle, AlertTriangle, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/** Normaliza texto: remove acentos, caixa alta, sem espaços extras */
const norm = (str) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const AnalisarIPENModal = ({ onComplete, mesesDisponiveis = [] }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [mesRef, setMesRef] = useState('');
  const { toast } = useToast();

  // -------------------------------------------------------
  // Gera opções de mês (mesmas do ImportarVisitasPDF)
  // -------------------------------------------------------
  const getMeses = () => {
    if (mesesDisponiveis.length > 0) {
      return mesesDisponiveis.map(m => {
        const mesStr = String(m.mes).padStart(2, '0');
        return { value: `${m.ano}-${mesStr}`, label: `${mesStr}/${m.ano} — (${m.total} ag.)` };
      });
    }
    const meses = [];
    const hoje = new Date();
    const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      meses.push({ value: `${ano}-${mes}`, label: `${nomes[d.getMonth()]} ${ano}` });
    }
    return meses;
  };

  // -------------------------------------------------------
  // Extrai todos os itens de texto com coordenadas X,Y
  // -------------------------------------------------------
  const extractItems = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    const allItems = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        const text = item.str.trim();
        if (!text) continue;
        allItems.push({
          text,
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          page: p,
        });
      }
    }
    return allItems;
  };

  // -------------------------------------------------------
  // Parser do Relatório 8.13 — Relação de Parentesco
  //
  // Estrutura do PDF (colunas identificadas por X):
  //   Reeducando | Cela | Visitante | Vínculo | Carteira
  //
  // Estratégia:
  //  1. Detecta colunas pelo cabeçalho da pág. 1
  //  2. Agrupa itens por linha visual (Y ± tolerância, por página)
  //  3. O campo "Reeducando" é preenchido carry-forward (merged cell)
  //  4. Extrai matrícula (6 dígitos) do campo Reeducando
  //  5. Extrai nome limpo do campo Visitante (remove ID numérico)
  // -------------------------------------------------------
  const parseParentescoPDF = (allItems) => {
    // 1. Detecta colunas no cabeçalho
    const headerKeywords = {
      'REEDUCANDO': 'reeducando',
      'CELA':       'cela',
      'VISITANTE':  'visitante',
      'VINCULO':    'vinculo',
      'CARTEIRA':   'carteira',
    };

    const columnX = {};
    let headerY = null;

    for (const item of allItems) {
      const n = norm(item.text);
      for (const [keyword, colName] of Object.entries(headerKeywords)) {
        if ((n === keyword || n.startsWith(keyword)) && !columnX[colName]) {
          columnX[colName] = item.x;
          if (item.page === 1 && !headerY) headerY = item.y;
        }
      }
    }

    console.log('[8.13 Parser] Colunas detectadas:', columnX);

    if (!columnX.reeducando || !columnX.visitante || !columnX.vinculo) {
      throw new Error(
        `Colunas insuficientes no PDF. Encontradas: ${Object.keys(columnX).join(', ')}. ` +
        `Verifique se é o Relatório 8.13 (Relação de Parentesco).`
      );
    }

    // Ordena colunas por X
    const sortedCols = Object.entries(columnX).sort(([, a], [, b]) => a - b);

    const getColumn = (x) => {
      for (let i = sortedCols.length - 1; i >= 0; i--) {
        const [colName, colX] = sortedCols[i];
        if (x >= colX - 20) return colName;
      }
      return sortedCols[0]?.[0] || 'unknown';
    };

    // 2. Filtra itens abaixo do cabeçalho
    const dataItems = allItems.filter(item => {
      if (item.page === 1 && headerY && item.y >= headerY - 2) return false;
      const n = norm(item.text);
      if (Object.keys(headerKeywords).some(k => n === k || n.startsWith(k))) return false;
      // Filtra rodapés e metadados comuns
      if (n.includes('IMPRESSO EM') || n.startsWith('PAGINA') || n.includes('VISITANTES POR')) return false;
      if (n.includes('ESTADO DE SANTA') || n.includes('SECRETARIA') || n.includes('POLICIA PENAL')) return false;
      if (n.includes('CARTEIRAS COM MENOS') || n.includes('LAGES') || n.includes('8082')) return false;
      if (n.startsWith('RESULTADO') || n.startsWith('TOTAL') || n.startsWith('WWW.')) return false;
      return true;
    });

    // 3. Agrupa por linha visual (Y ± 3px por página)
    const yTolerance = 3;
    const rowMap = new Map();
    for (const item of dataItems) {
      const yKey = Math.round(item.y / yTolerance) * yTolerance;
      const key = `${item.page}_${yKey}`;
      if (!rowMap.has(key)) rowMap.set(key, []);
      rowMap.get(key).push(item);
    }

    // Ordena linhas: por página ASC, por Y DESC (topo → baixo no PDF)
    const sortedRows = [...rowMap.entries()]
      .map(([key, items]) => {
        const [page, y] = key.split('_').map(Number);
        return { page, y, items };
      })
      .sort((a, b) => a.page - b.page || b.y - a.y);

    // 4. Monta linhas com colunas atribuídas
    const parsedRows = sortedRows.map(row => {
      const cols = {};
      for (const item of row.items) {
        const col = getColumn(item.x);
        if (!cols[col]) cols[col] = '';
        cols[col] += (cols[col] ? ' ' : '') + item.text;
      }
      return cols;
    });

    console.log('[8.13 Parser] Primeiras 5 linhas:', parsedRows.slice(0, 5));

    // 5. Carry-forward do Reeducando + extração dos dados
    const resultado = [];
    let currentMatricula = null;
    let currentNomePreso = null;

    for (const row of parsedRows) {
      // Linha de Reeducando: campo reeducando preenchido, começa com 6 dígitos
      const reeducandoRaw = (row.reeducando || '').trim();
      const matrMatch = reeducandoRaw.match(/^(\d{6})\s+(.+)/);
      if (matrMatch) {
        currentMatricula = matrMatch[1];
        currentNomePreso = matrMatch[2].replace(/\s+/g, ' ').trim().toUpperCase();
      }

      if (!currentMatricula) continue;

      // Linha de visitante: campo visitante preenchido
      const visitanteRaw = (row.visitante || '').trim();
      if (!visitanteRaw) continue;

      // Extrai o ID numérico (prontuário) do início do visitante
      const prontMatch = visitanteRaw.match(/^(\d+)/);
      const prontuarioVisitante = prontMatch ? prontMatch[1] : null;

      // Remove ID numérico do início do nome do visitante (ex: "63557 FULANA DE TAL")
      const nomeVisitante = visitanteRaw.replace(/^\d+\s+/, '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (!nomeVisitante || nomeVisitante.length < 4) continue;

      const vinculo = (row.vinculo || 'Não Identificado').replace(/\s+/g, ' ').trim();

      resultado.push({
        matricula_preso:            currentMatricula,
        nome_preso:                 currentNomePreso,
        nome_visitante:             nomeVisitante,
        nome_visitante_normalizado: norm(nomeVisitante),
        vinculo,
        periodo_ref:                mesRef,
        prontuario_visitante:       prontuarioVisitante,
      });
    }

    console.log(`[8.13 Parser] ${resultado.length} vínculos extraídos`);
    if (resultado.length > 0) console.log('[8.13 Parser] Exemplo[0]:', resultado[0]);

    return resultado;
  };

  // -------------------------------------------------------
  // Upload e processamento
  // -------------------------------------------------------
  const handleFileUpload = async (event) => {
    if (!mesRef) {
      toast({
        title: 'Mês Obrigatório',
        description: 'Selecione o mês de referência antes de fazer o upload.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setStats(null);

    try {
      // 1. Extrai itens com coordenadas
      const allItems = await extractItems(file);
      console.log(`[AnalisarIPENModal] ${allItems.length} itens extraídos`);

      // 2. Parse do 8.13
      const registrosRaw = parseParentescoPDF(allItems);

      if (registrosRaw.length === 0) {
        throw new Error(
          'Nenhum vínculo encontrado. Verifique se é o Relatório 8.13 (Relação de Parentesco).'
        );
      }

      // 3. Deduplicar registros baseados na chave única do banco (matricula_preso + nome_visitante_normalizado)
      // O Supabase rejeita upsert se o mesmo payload contiver a mesma chave única duas vezes (ON CONFLICT DO UPDATE cannot affect row a second time)
      const registros = [];
      const keysSeen = new Set();
      
      for (const reg of registrosRaw) {
        const uniqueKey = `${reg.matricula_preso}_${reg.nome_visitante_normalizado}`;
        if (!keysSeen.has(uniqueKey)) {
          keysSeen.add(uniqueKey);
          registros.push(reg);
        }
      }

      console.log(`[AnalisarIPENModal] ${registrosRaw.length} originais -> ${registros.length} deduplicados`);

      // 4. Upsert em lotes (mantém histórico, atualiza vínculos desatualizados)
      //    Conflito em (matricula_preso, nome_visitante_normalizado, periodo_ref) → atualiza vínculo
      const batchSize = 500;
      let upsertados = 0;
      for (let i = 0; i < registros.length; i += batchSize) {
        const batch = registros.slice(i, i + batchSize);
        const { error } = await supabase
          .from('vinculos_ipen')
          .upsert(batch, {
            onConflict: 'matricula_preso,nome_visitante_normalizado,periodo_ref',
            ignoreDuplicates: false,
          });
        if (error) throw error;
        upsertados += batch.length;
      }

      setStats({
        total: registros.length,
        upsertados,
      });

      toast({
        title: 'Parentescos Importados!',
        description: `${registros.length} vínculos sincronizados para ${mesRef}.`,
      });

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Erro no processamento do 8.13:', error);
      toast({
        title: 'Erro ao processar PDF',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const mesesOptions = getMeses();

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStats(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-dashed border-indigo-400 hover:border-indigo-600 hover:text-indigo-700 transition-all">
          <Users size={16} />
          Importar Parentescos (8.13)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white" aria-describedby="import-parentesco-desc">
        <DialogHeader>
          <DialogTitle>Importar Relação de Parentesco</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-sm text-gray-600 animate-pulse font-medium">
                Extraindo vínculos e sincronizando banco...
              </p>
            </div>
          ) : stats ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <p className="text-sm font-bold text-gray-900">Sincronização Concluída!</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Vínculos processados: <span className="font-bold text-gray-900">{stats.total}</span></p>
                <p>Inseridos/Atualizados: <span className="font-bold text-indigo-700">{stats.upsertados}</span></p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center w-full">
              <div className="bg-indigo-50 p-3 rounded-full">
                <Users className="text-indigo-500" size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  Relação de Parentesco (Relatório 8.13)
                </p>
                <p id="import-parentesco-desc" className="text-xs text-gray-500 mb-2">
                  Importe o relatório 8.13 do IPEN para sincronizar os vínculos (parentesco) dos visitantes.
                  Isso garante que os gráficos de <strong>Vínculos mais ativos</strong> e{' '}
                  <strong>Faltas por Vínculo</strong> usem dados oficiais.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2 my-2 text-left">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <CalendarDays size={14} />
                  Mês de Referência
                </label>
                <Select value={mesRef} onValueChange={setMesRef}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-xl">
                    {mesesOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="parentesco-pdf-upload"
                onChange={handleFileUpload}
              />
              <label htmlFor="parentesco-pdf-upload" className="mt-2 w-full">
                <Button
                  asChild
                  variant="default"
                  className="bg-indigo-600 hover:bg-indigo-700 w-full"
                  disabled={!mesRef}
                >
                  <span className={`cursor-pointer text-white ${!mesRef ? 'opacity-50' : ''}`}>
                    Carregar 8.13 e Sincronizar Vínculos
                  </span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-md flex gap-2">
          <AlertTriangle className="text-indigo-600 shrink-0" size={16} />
          <p className="text-[10px] text-indigo-800 leading-relaxed">
            <strong>Dica:</strong> Use o relatório <strong>8.13 — Visitantes por Reeducando</strong> do IPEN.
            Os vínculos existentes serão atualizados e novos serão adicionados sem apagar histórico.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); setStats(null); }}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalisarIPENModal;
