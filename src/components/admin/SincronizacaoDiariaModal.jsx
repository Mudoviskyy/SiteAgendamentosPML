import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, FileUp, CheckCircle, AlertTriangle, ChevronRight, Lock, CalendarDays } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  extractTextFromPDF,
  extractItemsFromPDF,
  parsear15,
  parsear19,
  parsear213,
  parsear86,
  parsear813
} from '@/lib/ipenParsers';

const SincronizacaoDiariaModal = ({ open, onComplete }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [periodoRef, setPeriodoRef] = useState('');
  const [periodoLabel, setPeriodoLabel] = useState('');
  const { toast } = useToast();
  
  const fileInputRef = useRef(null);

  // Usar mês atual como referência
  useEffect(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    
    const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                   
    setPeriodoRef(`${ano}-${mes}`);
    setPeriodoLabel(`${nomes[hoje.getMonth()]} de ${ano}`);
  }, []);

  const stepsInfo = [
    {
      id: 1,
      nome: 'Relatório 1.9',
      desc: 'Data de Ingresso',
      instrucoes: 'No IPEN, gere o Relatório 1.9 SEM alterar as pré-definições, apenas clique na lupa.',
    },
    {
      id: 2,
      nome: 'Relatório 2.13',
      desc: 'Comportamento',
      instrucoes: 'No IPEN, gere o Relatório 2.13 SEM alterar as pré-definições.',
    },
    {
      id: 3,
      nome: 'Relatório 8.6',
      desc: 'Visitas Realizadas',
      instrucoes: `No IPEN, gere o Relatório 8.6 na aba UNIDADE, selecionando o período de ${periodoLabel}.`,
    },
    {
      id: 4,
      nome: 'Relatório 8.13',
      desc: 'Parentescos',
      instrucoes: 'No IPEN, gere o Relatório 8.13 sem filtros extras. Apenas exporte.',
    },
    {
      id: 5,
      nome: 'Relatório 1.5',
      desc: 'Base de Internos',
      instrucoes: 'No IPEN, gere o Relatório 1.5 marcando "SELEÇÃO".',
    }
  ];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');

    try {
      if (step === 1) {
        // 1.9
        const texto = await extractTextFromPDF(file);
        const registros = parsear19(texto);
        const { error } = await supabase.from('base_pdf').upsert(registros, { onConflict: 'matricula' });
        if (error) throw error;

      } else if (step === 2) {
        // 2.13
        const texto = await extractTextFromPDF(file);
        const registros = parsear213(texto);
        const { error } = await supabase.from('base_pdf').upsert(registros, { onConflict: 'matricula' });
        if (error) throw error;

      } else if (step === 3) {
        // 8.6
        const allItems = await extractItemsFromPDF(file);
        const concluidas = parsear86(allItems, periodoRef);
        
        const batchSize = 500;
        for (let idx = 0; idx < concluidas.length; idx += batchSize) {
          const batch = concluidas.slice(idx, idx + batchSize);
          const { error } = await supabase
            .from('visitas_realizadas')
            .upsert(batch, { onConflict: 'matricula_detento,nome_visitante_normalizado,data_visita', ignoreDuplicates: true });
          if (error) throw error;
        }

      } else if (step === 4) {
        // 8.13
        const allItems = await extractItemsFromPDF(file);
        const registrosRaw = parsear813(allItems, periodoRef);

        const registros = [];
        const keysSeen = new Set();
        
        for (const reg of registrosRaw) {
          const uniqueKey = `${reg.matricula_preso}_${reg.nome_visitante_normalizado}`;
          if (!keysSeen.has(uniqueKey)) {
            keysSeen.add(uniqueKey);
            registros.push(reg);
          }
        }

        const batchSize = 500;
        for (let idx = 0; idx < registros.length; idx += batchSize) {
          const batch = registros.slice(idx, idx + batchSize);
          const { error } = await supabase
            .from('vinculos_ipen')
            .upsert(batch, { onConflict: 'matricula_preso,nome_visitante_normalizado,periodo_ref', ignoreDuplicates: false });
          if (error) throw error;
        }

      } else if (step === 5) {
        // 1.5
        const texto = await extractTextFromPDF(file);
        const registros = parsear15(texto);
        
        // Fazer upsert em lotes para evitar payload muito grande
        const batchSize = 500;
        for (let idx = 0; idx < registros.length; idx += batchSize) {
          const batch = registros.slice(idx, idx + batchSize);
          const { error } = await supabase
            .from('base_pdf')
            .upsert(batch, { onConflict: 'matricula' });
          if (error) throw error;
        }
      }

      toast({
        title: "Sucesso!",
        description: `Passo ${step} concluído com sucesso.`,
      });
      
      // Auto-avançar
      setStep(s => s + 1);

    } catch (error) {
      console.error("Erro no processamento:", error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentStepInfo = stepsInfo.find(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-white [&>button]:hidden pointer-events-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <Lock size={20} />
            <DialogTitle>Bloqueio Diário de Segurança</DialogTitle>
          </div>
          <p className="text-sm text-gray-600">
            Para iniciar os trabalhos hoje, é obrigatório sincronizar a base do IPEN. Siga os passos abaixo na ordem.
          </p>
        </DialogHeader>

        {step === 0 && (
          <div className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg bg-gray-50/50 mt-4 text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <CalendarDays className="text-blue-600" size={32} />
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Mês de Referência</h3>
            <p className="text-sm text-gray-600 mb-4">
              A extração de métricas (8.6 e 8.13) usará os dados referentes a:
            </p>
            <div className="text-xl font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-md border border-blue-200 mb-6">
              {periodoLabel}
            </div>
            <Button onClick={() => setStep(1)} className="w-full">
              Iniciar Sincronização <ChevronRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {step > 0 && step <= 5 && (
          <div className="mt-4">
            {/* Progress Bar */}
            <div className="flex justify-between mb-2">
              {stepsInfo.map(s => (
                <div key={s.id} className={`flex-1 h-2 mx-1 rounded-full ${s.id < step ? 'bg-green-500' : s.id === step ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className="text-xs text-center text-gray-500 font-medium mb-6">Passo {step} de 5</p>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/30">
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm text-gray-600 animate-pulse font-medium">Extraindo texto e salvando dados...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center w-full">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FileUp className="text-blue-600" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-gray-900">{currentStepInfo.nome}</p>
                    <p className="text-sm font-medium text-blue-700">{currentStepInfo.desc}</p>
                  </div>
                  
                  <div className="bg-white border border-gray-200 p-3 rounded-md shadow-sm w-full mt-2 text-left">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Instrução</p>
                    <p className="text-sm text-gray-800">{currentStepInfo.instrucoes}</p>
                  </div>

                  {errorMsg && (
                    <div className="w-full bg-red-50 border border-red-200 p-3 rounded-md flex gap-2 text-left items-start mt-2">
                      <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-red-800 font-medium">{errorMsg}</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    id={`pdf-upload-step-${step}`}
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                  />
                  <label htmlFor={`pdf-upload-step-${step}`} className="w-full mt-2">
                    <Button asChild variant="default" className="w-full">
                      <span className="cursor-pointer">Enviar PDF {currentStepInfo.nome}</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col items-center justify-center p-6 mt-4 text-center">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h3 className="font-bold text-xl text-gray-900 mb-2">Tudo Pronto!</h3>
            <p className="text-sm text-gray-600 mb-6">
              A base foi sincronizada com sucesso. Todos os administradores agora podem utilizar o sistema livremente hoje.
            </p>
            <Button onClick={onComplete} className="w-full bg-green-600 hover:bg-green-700">
              Entrar no Sistema
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default SincronizacaoDiariaModal;
