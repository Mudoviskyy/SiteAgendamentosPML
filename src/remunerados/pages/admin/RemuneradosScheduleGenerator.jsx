
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarDays, Settings2, Loader2, Play } from 'lucide-react';
import { useRemuneradosAdmin } from '../../hooks/useRemuneradosAdmin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const RemuneradosScheduleGenerator = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2); // Default to next month correctly
  const [year, setYear] = useState(new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear());
  const [rdCount, setRdCount] = useState(3);
  const [rnCount, setRnCount] = useState(2);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const { generateMonthlySchedule, loading } = useRemuneradosAdmin();

  const handleGenerate = async () => {
    // A função retorna status, o hook já mostra toast. Fechar modal em sucesso.
    const res = await generateMonthlySchedule(year, month, rdCount, rnCount);
    if (res.success) {
      setConfirmOpen(false);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6">
      <Helmet><title>Gerador de Agenda - Remunerados</title></Helmet>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#2D5016]" /> Gerador Automático de Escala
        </h1>
        <p className="text-gray-500 mt-1">Crie rapidamente as vagas padrão para todo o mês (dias úteis).</p>
      </div>

      <Card className="max-w-2xl border-0 shadow-sm">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-gray-500" /> Configuração do Mês
          </CardTitle>
          <CardDescription>Defina os parâmetros base para geração das vagas.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5016]"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
              >
                {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} min={2024} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Vagas RD por Dia (Seg-Sex)</Label>
              <Input type="number" value={rdCount} onChange={(e) => setRdCount(parseInt(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>Vagas RN por Dia (Seg-Sex)</Label>
              <Input type="number" value={rnCount} onChange={(e) => setRnCount(parseInt(e.target.value))} min={0} />
            </div>
          </div>

          <Button 
            className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white h-12 text-lg" 
            onClick={() => setConfirmOpen(true)}
          >
            <Play className="w-5 h-5 mr-2" /> Iniciar Geração
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Geração</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-4 text-gray-600 space-y-2">
                <p>Você está prestes a gerar a escala para <strong className="text-gray-900">{monthNames[month-1]} de {year}</strong>.</p>
                <ul className="list-disc pl-5">
                  <li>{rdCount} vagas de RD diárias</li>
                  <li>{rnCount} vagas de RN diárias</li>
                </ul>
                <p className="text-sm text-amber-600 mt-2">Apenas dias úteis (segunda a sexta) serão preenchidos. Deseja continuar?</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleGenerate} className="bg-[#2D5016] text-white hover:bg-[#1f3810]" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Gerando..." : "Sim, Gerar Agenda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RemuneradosScheduleGenerator;
