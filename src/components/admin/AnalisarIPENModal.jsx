import React, { useState } from 'react';
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
import { extractItemsFromPDF, parsear813 } from '@/lib/ipenParsers';

const AnalisarIPENModal = ({ onComplete, mesesDisponiveis = [] }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [mesRef, setMesRef] = useState('');
  const { toast } = useToast();

  // -------------------------------------------------------
  // Gera opções de mês
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
  // Upload e processamento — usa parsear813 de ipenParsers.js
  // para garantir extração idêntica à sincronização diária.
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
      // 1. Extrai itens com coordenadas (X, Y, página)
      const allItems = await extractItemsFromPDF(file);
      console.log(`[AnalisarIPENModal] ${allItems.length} itens extraídos`);

      // 2. Parse do 8.13 usando o parser canônico de ipenParsers.js
      const registrosRaw = parsear813(allItems, mesRef);

      if (registrosRaw.length === 0) {
        throw new Error(
          'Nenhum vínculo encontrado. Verifique se é o Relatório 8.13 (Relação de Parentesco).'
        );
      }

      // 3. Deduplicar (chave: matricula_preso + nome_visitante_normalizado)
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

      // 4. Upsert em lotes — conflito em (matricula_preso, nome_visitante_normalizado, periodo_ref)
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

      setStats({ total: registros.length, upsertados });

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
