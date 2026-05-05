import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useRemunerados } from '../hooks/useRemunerados';
import { remuneradosService } from '../services/remuneradosService';
import { Loader2, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

const PLANTAO_COLORS = {
  'A': 'bg-blue-500',
  'B': 'bg-emerald-500',
  'C': 'bg-amber-500',
  'D': 'bg-purple-500',
  'Administrativo': 'bg-slate-500',
  'Outras Unidades': 'bg-rose-500',
};

const TURNOS_RD = [
  '08:00 às 16:00',
  '10:00 às 18:00',
  '12:00 às 20:00',
  '16:00 às 00:00'
];

const TURNOS_RN = [
  '22:00 às 06:00',
  '00:00 às 08:00'
];

const SolicitarServico = ({ servidorId, servidorPlantao, onSolicitado }) => {
  const [tipo, setTipo] = useState('');
  const [data, setData] = useState('');
  const [turno, setTurno] = useState('');
  const [isDuplo, setIsDuplo] = useState(false);
  const [limitesMes, setLimitesMes] = useState({ limite_rd: 5, limite_rn: 5 });
  
  const { fetchVagas, solicitarServico, vagasDisponiveis, servicos, loading } = useRemunerados();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tipo) {
      fetchVagas(tipo);
      setTurno('');
      if (tipo === 'RN') setIsDuplo(false);

      // Carregar limites do mês atual
      const now = new Date();
      const anoMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      remuneradosService.fetchLimitesMes(anoMes).then(res => {
        if (res.success) setLimitesMes(res.data);
      });
    }
  }, [tipo, fetchVagas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tipo || !data) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o tipo e a data.",
        variant: "destructive"
      });
      return;
    }

    if (!isDuplo && !turno) {
      toast({
        title: "Turno obrigatório",
        description: "Selecione um turno para o serviço.",
        variant: "destructive"
      });
      return;
    }

    const custoVagas = isDuplo ? 2 : 1;

    // Verificação de Limite Mensal (separado por tipo)
    const dataSelecionada = new Date(data + 'T12:00:00Z');
    const mesAlvo = dataSelecionada.getMonth();
    const anoAlvo = dataSelecionada.getFullYear();

    const servicosDoTipoNoMes = servicos.filter(s => {
      if (!s.data || s.tipo !== tipo) return false;
      const d = new Date(s.data + 'T12:00:00Z');
      return d.getMonth() === mesAlvo && d.getFullYear() === anoAlvo && s.status !== 'cancelado' && s.status !== 'recusado';
    });

    const aprovadosCount = servicosDoTipoNoMes.filter(s => s.status === 'aprovado').length;
    const limiteBase = tipo === 'RD' ? limitesMes.limite_rd : limitesMes.limite_rn;
    
    // REGRA 2 + 3: Se não tem 2 aprovados, o limite total (pendentes+aprovados) é 2.
    const limiteEfetivo = aprovadosCount < 2 ? 2 : limiteBase;
    const totalAposPedido = servicosDoTipoNoMes.length + custoVagas;

    if (totalAposPedido > limiteEfetivo) {
      let mensagem = `Você já possui ${servicosDoTipoNoMes.length} solicitações de ${tipo} este mês.`;
      if (aprovadosCount < 2 && limiteBase > 2) {
        mensagem += ` O limite inicial é de 2 agendamentos. Para liberar as outras ${limiteBase - 2} vagas do mês, você precisa ter os 2 primeiros aprovados pela administração.`;
      } else {
        mensagem += ` O limite máximo é de ${limiteBase} por servidor.`;
      }

      toast({ 
        title: "Limite Excedido", 
        description: mensagem, 
        variant: "destructive" 
      });
      return;
    }

    // Validação de vagas
    const vagaSelecionada = vagasDisponiveis.find(v => v.data === data);
    if (!vagaSelecionada) {
       toast({
        title: "Erro",
        description: "Vaga não disponível para esta data.",
        variant: "destructive"
      });
      return;
    }

    if (vagaSelecionada.vagas_ocupadas + custoVagas > vagaSelecionada.vagas_totais) {
       toast({
        title: "Vagas Insuficientes",
        description: `Não há vagas suficientes para este pedido (${custoVagas} necessárias). Restam ${vagaSelecionada.vagas_totais - vagaSelecionada.vagas_ocupadas} vagas.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    let solicitacoes = [];
    if (isDuplo && tipo === 'RD') {
       solicitacoes = [
         { servidor_id: servidorId, data, tipo, turno: TURNOS_RD[0] },
         { servidor_id: servidorId, data, tipo, turno: TURNOS_RD[3] }
       ];
    } else {
       solicitacoes = [
         { servidor_id: servidorId, data, tipo, turno }
       ];
    }

    const result = await solicitarServico(solicitacoes);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Sucesso!",
        description: "Serviço solicitado com sucesso. Aguardando aprovação.",
        className: "bg-[#2D5016] text-white"
      });
      setTipo('');
      setData('');
      setTurno('');
      setIsDuplo(false);
      if(onSolicitado) onSolicitado();
    } else {
      toast({
        title: "Erro ao solicitar",
        description: result.error || "Ocorreu um erro.",
        variant: "destructive"
      });
    }
  };
  
  const vagasFiltradas = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    return vagasDisponiveis.filter(v => {
      const isAvailable = v.vagas_ocupadas < v.vagas_totais;
      return isAvailable && v.data >= firstDayOfMonth;
    });
  }, [vagasDisponiveis]);

  const turnosOptions = tipo === 'RD' ? TURNOS_RD : TURNOS_RN;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Solicitar RD / RN</CardTitle>
          {servidorPlantao && (
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-semibold py-1 px-3 border-gray-300">
              <div className={`w-2.5 h-2.5 rounded-full ${PLANTAO_COLORS[servidorPlantao] || 'bg-gray-400'}`} />
              {servidorPlantao === 'Outras Unidades' ? 'Outras Unid.' : servidorPlantao === 'Administrativo' ? 'Administrativo' : `Plantão ${servidorPlantao}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Serviço</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione RD ou RN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RD">Retribuição Financeira Diária (RD)</SelectItem>
                <SelectItem value="RN">Retribuição Financeira Noturna (RN)</SelectItem>
              </SelectContent>
            </Select>
            {tipo && (() => {
              const now = new Date();
              const mesAlvo = now.getMonth();
              const anoAlvo = now.getFullYear();
              const servicosTipoMes = servicos.filter(s => {
                if (!s.data || s.tipo !== tipo) return false;
                const d = new Date(s.data + 'T12:00:00Z');
                return d.getMonth() === mesAlvo && d.getFullYear() === anoAlvo && s.status !== 'cancelado' && s.status !== 'recusado';
              });
              
              const aprovados = servicosTipoMes.filter(s => s.status === 'aprovado').length;
              const usados = servicosTipoMes.length;
              const limiteBase = tipo === 'RD' ? limitesMes.limite_rd : limitesMes.limite_rn;
              const limiteEfetivo = aprovados < 2 ? 2 : limiteBase;
              const restante = Math.max(0, limiteEfetivo - usados);
              
              const isTravadoNoInicio = aprovados < 2 && usados >= 2 && limiteBase > 2;

              return (
                <div className="space-y-2 mt-2">
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${restante > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {restante > 0 
                      ? `Você ainda pode solicitar ${restante} ${tipo}(s) (Limite atual: ${limiteEfetivo})`
                      : `Limite de ${limiteEfetivo} ${tipo}(s) atingido`
                    }
                  </div>
                  {isTravadoNoInicio && (
                    <p className="text-[10px] text-amber-600 font-medium px-1 leading-tight">
                      * Você atingiu o limite inicial de 2. Para liberar as outras {limiteBase - 2} vagas do mês, aguarde a aprovação dos seus pedidos pendentes.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {tipo === 'RD' && (
            <div 
              className={`
                flex flex-row items-center gap-3 rounded-xl border p-4 transition-all cursor-pointer shadow-sm
                ${isDuplo ? 'border-emerald-500 bg-emerald-50' : 'bg-zinc-50/50 hover:border-zinc-300'}
              `}
              onClick={() => {
                const nextVal = !isDuplo;
                setIsDuplo(nextVal);
                if (nextVal) setTurno('');
              }}
            >
              <Checkbox 
                id="rd-duplo"
                checked={isDuplo} 
                onCheckedChange={(checked) => {
                  setIsDuplo(!!checked);
                  if (checked) setTurno('');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 border-emerald-500 data-[state=checked]:bg-emerald-500"
              />
              <div className="space-y-0.5 flex-1">
                <Label 
                  htmlFor="rd-duplo" 
                  className="text-base font-bold cursor-pointer text-emerald-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  RD Duplo (Dois Turnos)
                </Label>
                <p className="text-sm text-emerald-700 leading-tight">
                  Solicita os turnos de 08:00 às 16:00 e 16:00 às 00:00 (Consome 2 do limite).
                </p>
              </div>
            </div>
          )}

          {tipo && !isDuplo && (
            <div className="space-y-2">
              <Label>Selecione o Turno</Label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione um turno" />
                </SelectTrigger>
                <SelectContent>
                  {turnosOptions.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-base font-bold text-zinc-800">Selecione a Data</Label>
              {tipo && (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider bg-zinc-100 text-zinc-500 border-none">
                  Vagas para {tipo}
                </Badge>
              )}
            </div>
            
            {!tipo ? (
              <div className="p-8 border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Selecione o tipo de serviço primeiro</p>
              </div>
            ) : (
              <div className="flex flex-col items-center bg-white border border-zinc-200 rounded-xl p-4 shadow-inner">
                <DayPicker
                  mode="single"
                  locale={ptBR}
                  selected={data ? new Date(data + 'T12:00:00Z') : undefined}
                  onSelect={(day) => {
                    if (!day) return;
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const vaga = vagasDisponiveis.find(v => v.data === dateStr);
                    if (vaga && (vaga.vagas_totais - vaga.vagas_ocupadas) > 0) {
                      setData(dateStr);
                    } else {
                      toast({ 
                        title: "Data Indisponível", 
                        description: "Não há vagas disponíveis para esta data.", 
                        variant: "destructive" 
                      });
                    }
                  }}
                  disabled={{ before: new Date() }}
                  modifiers={{
                    vagas: vagasFiltradas.map(v => new Date(v.data + 'T12:00:00Z')),
                    esgotado: vagasDisponiveis.filter(v => (v.vagas_totais - v.vagas_ocupadas) <= 0).map(v => new Date(v.data + 'T12:00:00Z'))
                  }}
                  modifiersStyles={{
                    vagas: { fontWeight: 'bold', color: '#2D5016', backgroundColor: '#2D5016/5' },
                    esgotado: { color: '#ef4444', textDecoration: 'line-through', opacity: 0.5 }
                  }}
                  styles={{
                    day: { margin: '2px' },
                    head_cell: { width: '40px' },
                    cell: { width: '40px' }
                  }}
                />
                
                {data && (
                  <div className="mt-4 w-full p-3 bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-lg flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#2D5016] font-bold uppercase tracking-widest">Data Selecionada</span>
                      <span className="text-sm font-bold text-zinc-800">
                        {format(new Date(data + 'T12:00:00Z'), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vagas Livres</span>
                      <p className="text-lg font-black text-[#2D5016]">
                        {vagasDisponiveis.find(v => v.data === data)?.vagas_totais - (vagasDisponiveis.find(v => v.data === data)?.vagas_ocupadas || 0)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-4 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#2D5016]" />
                    <span>Com Vagas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400 opacity-50" />
                    <span>Esgotado</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white"
            disabled={isSubmitting || !tipo || !data || (!isDuplo && !turno)}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirmar Solicitação
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SolicitarServico;