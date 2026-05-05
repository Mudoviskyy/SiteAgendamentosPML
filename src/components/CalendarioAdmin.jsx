import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { fetchCalendarioAdminVisitantes } from '@/services/agendamentosService';
import { useToast } from '@/components/ui/use-toast';

export const CalendarioAdmin = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [galeria, setGaleria] = useState('all');
  const [tipoVisita, setTipoVisita] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (idx) => {
    setExpanded(prev => prev === idx ? null : idx);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const result = await fetchCalendarioAdminVisitantes(month, year, galeria, tipoVisita);
      setData(result || []);
    } catch (error) {
      console.error('Erro ao carregar calendário:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar os dados do calendário.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate, galeria, tipoVisita]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const firstDayOfMonth = getDay(startOfMonth(currentDate));
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getDayData = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return data.filter(item => {
      if (!item.data_visita) return false;
      return item.data_visita.slice(0, 10) === dateStr;
    });
  };

  const getBadgeColor = (ocupadas, totais) => {
    if (!totais || totais === 0) return 'bg-gray-100 text-gray-800';
    const percent = ocupadas / totais;
    if (percent >= 1) return 'bg-red-100 text-red-800 border-red-200';
    if (percent >= 0.8) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const agruparPorVaga = (dayItems) => {
    // dayItems agora já vem agrupado por vaga_id do banco de dados
    return dayItems.map(item => ({
      ...item,
      visitantes: (item.agendamentos_detalhes || []).map(a => ({
        visitante1: a.visitante1_nome,
        visitante2: a.visitante2_nome,
        visitante3: a.visitante3_nome,
        telefone: a.whatsapp,
        preso: a.nome_preso,
        status: a.status
      }))
    }));
  };

  const vagasAgrupadas = selectedDay ? agruparPorVaga(selectedDay.data) : [];

  const renderDaySummaries = (dayData) => {
    if (!dayData || dayData.length === 0) return null;
    const summaries = dayData.reduce((acc, item) => {
      const key = `${item.galeria}-${item.tipo_visita}`;
      if (!acc[key]) {
        acc[key] = {
          galeria: item.galeria,
          tipo: item.tipo_visita,
          ocupadas: 0,
          totais: 0
        };
      }
      // Agora usamos os campos já agregados da view para evitar duplicação
      acc[key].ocupadas += parseInt(item.vagas_ocupadas || 0, 10);
      acc[key].totais += parseInt(item.vagas_totais || 0, 10);
      return acc;
    }, {});

    return Object.values(summaries).map((sum, idx) => (
      <div
        key={idx}
        className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${getBadgeColor(sum.ocupadas, sum.totais)} font-medium truncate`}
        title={`${sum.galeria} (${sum.tipo}): ${sum.ocupadas}/${sum.totais}`}
      >
        {sum.galeria} {sum.tipo.startsWith('social') ? 'S' : 'I'}: {sum.ocupadas}/{sum.totais}
      </div>
    ));
  };

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleMonthChange = (val) => setCurrentDate(prev => new Date(prev.getFullYear(), parseInt(val, 10), 1));
  const handleYearChange = (val) => setCurrentDate(prev => new Date(parseInt(val, 10), prev.getMonth(), 1));

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2020, i, 1), 'MMMM', { locale: ptBR })
  }));

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1].map(y => y.toString());

  return (
    <Card className="w-full flex flex-col h-full bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
              <CalendarIcon className="w-5 h-5 text-[#2D5016]" />
              Calendário Operacional
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Visão consolidada de ocupação por dia e galeria
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px] h-9 text-sm capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[90px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={galeria} onValueChange={setGaleria}>
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue placeholder="Galeria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Galerias</SelectItem>
                <SelectItem value="A">Galeria A</SelectItem>
                <SelectItem value="B">Galeria B</SelectItem>
                <SelectItem value="C">Galeria C</SelectItem>
                <SelectItem value="D">Galeria D</SelectItem>
                <SelectItem value="E">Galeria E</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tipoVisita} onValueChange={setTipoVisita}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Tipo de Visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="social_presencial">Social Presencial</SelectItem>
                <SelectItem value="social_video">Social Vídeo</SelectItem>
                <SelectItem value="intima">Íntima</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center ml-auto bg-gray-100 rounded-md p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col p-4 pt-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-grow py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" />
            <p className="text-sm text-gray-500 mt-2">Carregando dados...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden flex-grow auto-rows-fr">
              {emptyDays.map(i => (
                <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[100px]" />
              ))}

              {daysInMonth.map((date) => {
                const dayData = getDayData(date);
                const isCurrentToday = isToday(date);

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => dayData.length > 0 && setSelectedDay({ date, data: dayData })}
                    className={`bg-white min-h-[100px] p-1.5 transition-colors ${dayData.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''
                      } ${isCurrentToday ? 'ring-2 ring-[#2D5016] ring-inset z-10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isCurrentToday ? 'bg-[#2D5016] text-white' : 'text-gray-700'
                        }`}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1 flex flex-col gap-0.5">
                      {renderDaySummaries(dayData)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" /> Disponível
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Atenção (≥80%)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" /> Lotado
          </div>
        </div>
      </CardContent>

      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#2D5016]" />
              Detalhes Operacionais - {selectedDay && format(selectedDay.date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            {vagasAgrupadas.map((vaga, idx) => {
              const visitantesValidos = vaga.visitantes.filter(
                v => v.status !== 'cancelado' && v.status !== 'revogado'
              );

              // Usamos os campos calculados diretamente da view
              const totalOcupadas = vaga.vagas_ocupadas || 0;
              const totalVagas = vaga.vagas_totais || 0;

              const pendentes = vaga.pendentes || 0;
              const aprovados = vaga.aprovados || 0;

              const percent = totalVagas > 0 ? totalOcupadas / totalVagas : 0;
              const isFull = percent >= 1;
              const isWarning = percent >= 0.8 && percent < 1;

              return (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(idx)}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white border-gray-300 font-semibold">
                        Galeria {vaga.galeria}
                      </Badge>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {vaga.tipo_visita.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <ClockIcon className="w-3.5 h-3.5 mr-1" />
                        {vaga.horario.substring(0, 5)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {expanded === idx ? '▲' : '▼'}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs items-center">
                    <span className="text-yellow-600 font-semibold">
                      Pend: {pendentes}
                    </span>
                    <span className="text-green-600 font-semibold">
                      Aprov: {aprovados}
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${isFull
                        ? 'bg-red-100 text-red-700'
                        : isWarning
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-[#2D5016]'
                        }`}
                    >
                      {totalOcupadas}/{totalVagas}
                    </span>
                  </div>

                  {expanded === idx && (
                    <div className="bg-white border rounded-md p-3 space-y-3 text-sm">
                      {visitantesValidos.map((v, i) => (
                        <div key={i} className="border-b pb-2 mb-2">
                          <p className="font-semibold text-gray-700">
                            👤 {v.visitante1} (Principal)
                          </p>
                          {v.visitante2 && <p>👤 {v.visitante2}</p>}
                          {v.visitante3 && <p>👤 {v.visitante3}</p>}
                          {v.telefone && <p>📞 {v.telefone}</p>}
                          {v.preso && <p>🏛️ {v.preso}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const ClockIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default CalendarioAdmin;