import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRemuneradosAdmin } from '../hooks/useRemuneradosAdmin';
import DayDetailsModal from './DayDetailsModal';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CalendarioRemunerados() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const hooks = useRemuneradosAdmin();
  const { fetchCalendarioData, loading } = hooks;

  const loadData = useCallback(async (dateToLoad) => {
    if (!fetchCalendarioData) return;
    const d = dateToLoad || currentMonth;
    const res = await fetchCalendarioData(d.getMonth() + 1, d.getFullYear());
    if (res && res.success) {
      setCalendarData(res.data);
    }
  }, [fetchCalendarioData, currentMonth]);

  useEffect(() => {
    loadData(currentMonth);
  }, [currentMonth, loadData]);

  const dataByDate = useMemo(() => {
    const map = {};
    if (calendarData && calendarData.length > 0) {
      calendarData.forEach(item => {
        if (!map[item.data]) map[item.data] = [];
        map[item.data].push(item);
      });
    }
    return map;
  }, [calendarData]);

  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDateStr(format(date, 'yyyy-MM-dd'));
    setModalOpen(true);
  };

  const handleModalDataChange = () => {
    loadData(currentMonth);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleMonthChange = (val) => setCurrentMonth(prev => new Date(prev.getFullYear(), parseInt(val, 10), 1));
  const handleYearChange = (val) => setCurrentMonth(prev => new Date(parseInt(val, 10), prev.getMonth(), 1));

  const monthsDropdown = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2020, i, 1), 'MMMM', { locale: ptBR })
  }));

  const currentYearNum = new Date().getFullYear();
  const yearsDropdown = [currentYearNum, currentYearNum + 1].map(y => y.toString());

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getColorClass = (record) => {
    if (!record || record.vagas_totais === 0) return 'bg-gray-200';
    if (record.vagas_ocupadas >= record.vagas_totais) return 'bg-red-500';
    if (record.vagas_ocupadas === record.vagas_totais - 1) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <Card className="w-full flex flex-col h-full bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
              <CalendarIcon className="w-5 h-5 text-[#2D5016]" />
              Escalas Remuneradas
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Visão consolidada das vagas em Serviços Extra (RD/RN)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading} className="mr-2">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Select value={currentMonth.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px] h-9 text-sm capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthsDropdown.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentMonth.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[90px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearsDropdown.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
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
        {loading && calendarData.length === 0 ? (
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
                <div key={`empty-${i}`} className="bg-white/50 min-h-[90px]" />
              ))}
              
              {daysInMonth.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dayRecords = dataByDate[dateStr] || [];
                const isCurrentToday = isToday(date);
                
                const rd = dayRecords.find(r => r.tipo === 'RD');
                const rn = dayRecords.find(r => r.tipo === 'RN');
                const hasData = rd || rn;

                return (
                  <div 
                    key={dateStr}
                    onClick={() => handleDayClick(date)}
                    className={`bg-white min-h-[90px] p-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-gray-50 hover:shadow-inner ${
                      !hasData ? 'opacity-70' : ''
                    } ${isCurrentToday ? 'ring-2 ring-inset ring-[#2D5016] z-10 bg-green-50/20' : ''}`}
                  >
                    <span className={`text-base font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                      isCurrentToday ? 'bg-[#2D5016] text-white' : 'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </span>
                    
                    {hasData && (
                      <div className="flex gap-2 mt-2">
                        <TooltipProvider delayDuration={100}>
                          {rd && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-black/5 ${getColorClass(rd)}`} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-bold">DIURNO (RD)</p>
                                <p className="text-xs">Ocupadas: {rd.vagas_ocupadas}/{rd.vagas_totais}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {rn && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-black/5 ${getColorClass(rn)}`} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-bold">NOTURNO (RN)</p>
                                <p className="text-xs">Ocupadas: {rn.vagas_ocupadas}/{rn.vagas_totais}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center gap-4 mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm ring-1 ring-black/5" /> LIVRE</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm ring-1 ring-black/5" /> ALERTA</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm ring-1 ring-black/5" /> LOTADO</div>
        </div>
      </CardContent>

      <DayDetailsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        dateStr={selectedDateStr} 
        dayData={selectedDateStr ? dataByDate[selectedDateStr] : []}
        hooks={hooks}
        onDataChange={handleModalDataChange}
      />
    </Card>
  );
}
