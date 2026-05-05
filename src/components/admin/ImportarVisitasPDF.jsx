import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileUp, CheckCircle, AlertTriangle, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

/** Normaliza texto removendo acentos para comparações seguras */
const norm = (str) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const ImportarVisitasPDF = ({ onComplete, mesesDisponiveis = [] }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [mesRef, setMesRef] = useState('');
  const { toast } = useToast();

  const getMeses = () => {
    if (mesesDisponiveis.length > 0) {
      return mesesDisponiveis.map(m => {
        const mesStr = String(m.mes).padStart(2, '0');
        return { value: `${m.ano}-${mesStr}`, label: `${mesStr}/${m.ano} — (${m.total} agendamentos)` };
      });
    }
    const meses = [];
    const hoje = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const nomesMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      meses.push({ value: `${ano}-${mes}`, label: `${nomesMes[d.getMonth()]} ${ano}` });
    }
    return meses;
  };

  /**
   * Extrai itens de texto com suas coordenadas X,Y de todas as páginas.
   */
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

  /**
   * Parser baseado em colunas — usa coordenadas X do cabeçalho para
   * identificar a qual coluna cada item de texto pertence.
   */
  const parseByColumns = (allItems, periodoRef) => {
    // 1. Identifica posições X das colunas a partir do cabeçalho
    const headerKeywords = {
      'VISITA': 'visita',
      'ENTRADA': 'entrada',
      'SAIDA': 'saida',
      'VISITANTE': 'visitante',
      'DETENTO': 'detento',
      'TIPO': 'tipo',
      'UNIDADE': 'unidade',
      'SITUACAO': 'situacao',
    };

    const columnX = {};
    let headerY = null;

    for (const item of allItems) {
      const n = norm(item.text);
      for (const [keyword, colName] of Object.entries(headerKeywords)) {
        if (n === keyword || n.startsWith(keyword)) {
          if (!columnX[colName]) {
            columnX[colName] = item.x;
            if (!headerY || item.page === 1) headerY = item.y;
          }
        }
      }
    }

    console.log('[Parser] Colunas detectadas:', columnX);
    console.log('[Parser] Cabeçalho na Y:', headerY);

    const colNames = Object.keys(columnX);
    if (colNames.length < 4) {
      throw new Error(`Não foi possível identificar as colunas da tabela. Encontradas: ${colNames.join(', ')}. Verifique se o PDF é o de "Visitas Realizadas".`);
    }

    // Ordena colunas por posição X
    const sortedCols = Object.entries(columnX).sort(([,a], [,b]) => a - b);

    // 2. Função para identificar a coluna de um item baseado em sua posição X
    const getColumn = (x) => {
      for (let i = sortedCols.length - 1; i >= 0; i--) {
        const [colName, colX] = sortedCols[i];
        if (x >= colX - 15) return colName;
      }
      return sortedCols[0]?.[0] || 'unknown';
    };

    // 3. Filtra itens abaixo do cabeçalho e agrupa por linhas visuais (Y semelhantes)
    const dataItems = allItems.filter(item => {
      // Ignora tudo que está na Y do cabeçalho ou acima (apenas na página 1)
      if (item.page === 1 && headerY && item.y >= headerY - 2) return false;
      // Ignora cabeçalhos repetidos em outras páginas
      const n = norm(item.text);
      if (Object.keys(headerKeywords).some(k => n === k || n.startsWith(k))) return false;
      // Ignora rodapés e metadados
      if (n.includes('IMPRESSO EM') || n.startsWith('PAGINA') || n.includes('SISTEMA DE IDENT')) return false;
      if (n.includes('ESTADO DE SANTA') || n.includes('SECRETARIA') || n.includes('POLICIA PENAL')) return false;
      if (n.includes('ARGUMENTOS') || n.includes('PESQUISA POR') || n.includes('PERIODO')) return false;
      if (n.startsWith('RESULTADO') || n.startsWith('TOTAL')) return false;
      return true;
    });

    // Agrupa itens por Y (tolerância de 3px = mesma linha visual)
    const yTolerance = 3;
    const rowMap = new Map();

    for (const item of dataItems) {
      const yKey = Math.round(item.y / yTolerance) * yTolerance;
      // Compõe chave com página para não misturar linhas de páginas diferentes
      const key = `${item.page}_${yKey}`;
      if (!rowMap.has(key)) rowMap.set(key, []);
      rowMap.get(key).push(item);
    }

    // Ordena linhas por página e Y (descendente = topo para baixo no PDF)
    const sortedRows = [...rowMap.entries()]
      .map(([key, items]) => {
        const [page, y] = key.split('_').map(Number);
        return { page, y, items };
      })
      .sort((a, b) => a.page - b.page || b.y - a.y); // Y descendente (topo primeiro)

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

    console.log('[Parser] Primeiras 5 linhas parseadas:', parsedRows.slice(0, 5));

    // 5. Agrupa em registros completos:
    //    Um novo registro começa quando a coluna "visita" contém uma data DD/MM/YYYY.
    //    Linhas sem data são continuação do registro anterior (nome multi-linha).
    const regexDate = /(\d{2}\/\d{2}\/\d{4})/;
    const registros = [];
    let current = null;

    for (const row of parsedRows) {
      const visitaText = row.visita || '';
      const dateMatch = visitaText.match(regexDate);

      if (dateMatch) {
        // Salva registro anterior
        if (current) registros.push(current);

        // Extrai horários da mesma célula ou das colunas entrada/saida
        const timesInVisita = visitaText.match(/\d{2}:\d{2}:\d{2}/g) || [];

        current = {
          data_str: dateMatch[1],
          hora_entrada: row.entrada || timesInVisita[0] || '',
          hora_saida: row.saida || timesInVisita[1] || '',
          visitante: row.visitante || '',
          detento: row.detento || '',
          tipo: row.tipo || '',
          unidade: row.unidade || '',
          situacao: row.situacao || '',
        };
      } else if (current) {
        // Continuação: acumula nomes e outros dados
        if (row.visitante) current.visitante += ' ' + row.visitante;
        if (row.detento) current.detento += ' ' + row.detento;
        if (row.tipo) current.tipo += ' ' + row.tipo;
        if (row.unidade) current.unidade += ' ' + row.unidade;
        if (row.situacao) current.situacao += ' ' + row.situacao;
        // Horários que podem estar em linhas subsequentes
        if (row.entrada && !current.hora_entrada) current.hora_entrada = row.entrada;
        if (row.saida && !current.hora_saida) current.hora_saida = row.saida;
      }
    }
    // Push último registro
    if (current) registros.push(current);

    console.log(`[Parser] ${registros.length} registros brutos agrupados`);
    if (registros.length > 0) {
      console.log('[Parser] Exemplo registro[0]:', registros[0]);
    }

    // 6. Converte para formato final
    const situacoesNorm = { 'CONCLUIDA': 'CONCLUÍDA', 'CANCELADA': 'CANCELADA', 'EM ANDAMENTO': 'EM ANDAMENTO', 'PENDENTE': 'PENDENTE', 'AGENDADA': 'AGENDADA' };

    const resultado = [];
    for (const reg of registros) {
      const [dia, mes, ano] = reg.data_str.split('/');
      const dataISO = `${ano}-${mes}-${dia}`;

      // Limpa e normaliza nomes
      const cleanName = (n) => n.replace(/\d{5,6}/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const nomeVisitante = cleanName(reg.visitante);
      const nomeDetento = cleanName(reg.detento);

      // Extrai matrículas dos nomes (podem estar embutidas)
      const matrVisitante = reg.visitante.match(/(\d{5,6})/)?.[1] || null;
      const matrDetento = reg.detento.match(/(\d{5,6})/)?.[1] || null;

      // Detecta situação
      const sitNorm = norm(reg.situacao);
      let situacaoFinal = 'NÃO INFORMADA';
      for (const [key, val] of Object.entries(situacoesNorm)) {
        if (sitNorm.includes(norm(key))) {
          situacaoFinal = val;
          break;
        }
      }

      // Detecta tipo  
      let tipoFinal = reg.tipo.replace(/\s+/g, ' ').trim().toUpperCase() || 'NÃO INFORMADO';

      if (!nomeVisitante || !nomeDetento) continue;

      resultado.push({
        data_visita: dataISO,
        hora_entrada: (reg.hora_entrada || '').replace(/[^\d:]/g, '').substring(0, 8),
        hora_saida: (reg.hora_saida || '').replace(/[^\d:]/g, '').substring(0, 8),
        nome_visitante: nomeVisitante,
        nome_visitante_normalizado: norm(nomeVisitante),
        matricula_visitante: matrVisitante,
        nome_detento: nomeDetento,
        nome_detento_normalizado: norm(nomeDetento),
        matricula_detento: matrDetento,
        tipo_visita: tipoFinal,
        situacao: situacaoFinal,
        unidade: reg.unidade.trim() || null,
        periodo_ref: periodoRef,
      });
    }

    // Log final de distribuição
    const sitCount = {};
    resultado.forEach(r => { sitCount[r.situacao] = (sitCount[r.situacao] || 0) + 1; });
    console.log('[Parser] Distribuição de situações:', sitCount);

    return resultado;
  };

  const handleFileUpload = async (event) => {
    if (!mesRef) {
      toast({ title: 'Mês Obrigatório', description: 'Selecione o mês de referência antes de fazer o upload.', variant: 'destructive' });
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
      console.log(`[ImportarVisitasPDF] ${allItems.length} itens de texto extraídos do PDF`);

      // 2. Parse por colunas
      const todosRegistros = parseByColumns(allItems, mesRef);

      if (todosRegistros.length === 0) {
        throw new Error('Não foi possível identificar registros. Verifique se o PDF é o de "Visitas Realizadas" do IPEN.');
      }

      // 3. Filtra apenas CONCLUÍDAS
      const concluidas = todosRegistros.filter(r => r.situacao === 'CONCLUÍDA');

      if (concluidas.length === 0) {
        const sitCount = {};
        todosRegistros.forEach(r => { sitCount[r.situacao] = (sitCount[r.situacao] || 0) + 1; });
        const detalhes = Object.entries(sitCount).map(([k, v]) => `${k}: ${v}`).join(', ');
        throw new Error(`Encontrados ${todosRegistros.length} registros, mas nenhum "Concluída". Situações: ${detalhes}`);
      }

      // 4. Deduplicação
      const { data: existentes } = await supabase
        .from('visitas_realizadas')
        .select('nome_visitante_normalizado, matricula_detento, data_visita, hora_entrada')
        .eq('periodo_ref', mesRef);

      const chaveExistente = new Set(
        (existentes || []).map(e => `${e.nome_visitante_normalizado}|${e.matricula_detento}|${e.data_visita}|${e.hora_entrada}`)
      );

      const novos = concluidas.filter(r => {
        const chave = `${r.nome_visitante_normalizado}|${r.matricula_detento}|${r.data_visita}|${r.hora_entrada}`;
        return !chaveExistente.has(chave);
      });

      if (novos.length === 0) {
        toast({ title: 'Nenhum registro novo', description: `Todos os ${concluidas.length} registros já existem no banco.` });
        setStats({ total: todosRegistros.length, concluidas: concluidas.length, ignoradas: todosRegistros.length - concluidas.length, novos: 0 });
        setLoading(false);
        return;
      }

      // 5. Insere em lotes
      const batchSize = 500;
      for (let idx = 0; idx < novos.length; idx += batchSize) {
        const batch = novos.slice(idx, idx + batchSize);
        const { error: insError } = await supabase.from('visitas_realizadas').insert(batch);
        if (insError) throw insError;
      }

      setStats({
        total: todosRegistros.length,
        concluidas: concluidas.length,
        ignoradas: todosRegistros.length - concluidas.length,
        novos: novos.length,
      });

      toast({ title: 'Sucesso!', description: `${novos.length} visitas concluídas salvas para ${mesRef}.` });
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Erro no processamento:', error);
      toast({ title: 'Erro ao processar PDF', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const mesesOptions = getMeses();

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStats(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-dashed border-emerald-400 hover:border-emerald-600 hover:text-emerald-700 transition-all">
          <FileUp size={16} />
          Importar Visitas Realizadas (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white" aria-describedby="import-visitas-desc">
        <DialogHeader>
          <DialogTitle>Importar Visitas Realizadas</DialogTitle>
          <DialogDescription id="import-visitas-desc">
            Importe o PDF de Visitas Realizadas do sistema IPEN para alimentar as métricas de presença e No-Show.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <p className="text-sm text-gray-600 animate-pulse font-medium">Extraindo colunas e processando registros...</p>
            </div>
          ) : stats ? (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <p className="text-sm font-bold text-gray-900">Importação Concluída!</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Total no PDF: <span className="font-bold text-gray-900">{stats.total}</span></p>
                <p>Concluídas: <span className="font-bold text-emerald-700">{stats.concluidas}</span></p>
                {stats.ignoradas > 0 && <p>Outras situações: <span className="font-bold text-amber-600">{stats.ignoradas}</span></p>}
                <p>Novos registros inseridos: <span className="font-bold text-blue-600">{stats.novos}</span></p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center w-full">
              <div className="bg-emerald-50 p-3 rounded-full">
                <FileUp className="text-emerald-500" size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">PDF de Visitas Realizadas (IPEN)</p>
                <p className="text-xs text-gray-500 mb-2">
                  Selecione o mês e anexe o PDF. Apenas visitas <strong>"Concluídas"</strong> serão salvas.
                  Para meses com mais de 1.000, importe múltiplos PDFs.
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

              <input type="file" accept=".pdf" className="hidden" id="visitas-pdf-upload" onChange={handleFileUpload} />
              <label htmlFor="visitas-pdf-upload" className="mt-2 w-full">
                <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700 w-full" disabled={!mesRef}>
                  <span className={`cursor-pointer text-white ${!mesRef ? 'opacity-50' : ''}`}>Carregar PDF e Gravar no Banco</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex gap-2">
          <AlertTriangle className="text-amber-600 shrink-0" size={16} />
          <p className="text-[10px] text-amber-800 leading-relaxed">
            <strong>Dica:</strong> O IPEN limita a 1.000 registros. Se o mês tiver mais visitas, exporte em intervalos menores.
            O sistema acumula sem duplicar.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); setStats(null); }}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportarVisitasPDF;
