import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { format, isValid, parseISO, differenceInCalendarDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Parseia uma string de data (YYYY-MM-DD ou ISO) como data LOCAL,
 * evitando problemas de UTC onde meia-noite UTC pode cair no dia anterior em BRT.
 */
const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  // Extrai apenas a parte YYYY-MM-DD
  const dateOnly = dateString.substring(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Cria a data no fuso local (mês é 0-indexed no Date constructor)
  return new Date(year, month - 1, day);
};

const formatLocalDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = parseLocalDate(dateString);
    return date && isValid(date) ? format(date, 'dd/MM/yyyy') : '—';
  } catch (e) { return '—'; }
};

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'aprovado':
      return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase">Aprovado</span>;
    case 'pendente':
      return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase">Pendente</span>;
    case 'cancelado':
    case 'revogado':
      return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold uppercase">Cancelado</span>;
    default:
      return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold uppercase">{status}</span>;
  }
};

const ProximaVisitaCard = ({ proximaVisita, loadingVisita, setInfoModalType }) => {
  const getDiasRestantesBadge = (dataVisita) => {
    if (!dataVisita) return null;
    const date = parseLocalDate(dataVisita);
    if (!date || !isValid(date)) return null;

    // differenceInCalendarDays compara apenas datas do calendário,
    // ignorando horas/minutos/segundos — imune a problemas de UTC
    const dias = differenceInCalendarDays(date, new Date());
    
    if (dias < 0) return null;
    if (dias === 0) return <Badge className="bg-red-500 hover:bg-red-600">É Hoje!</Badge>;
    if (dias === 1) return <Badge className="bg-amber-500 hover:bg-amber-600">Amanhã</Badge>;
    return <Badge className="bg-blue-500 hover:bg-blue-600">Faltam {dias} dias</Badge>;
  };

  return (
    <Card className="mb-8 border-none shadow-sm rounded-2xl overflow-hidden bg-white relative">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="bg-[#2D5016] p-6 flex items-center justify-center md:w-48 text-white relative">
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-black uppercase tracking-widest">Agenda</p>
            </div>
          </div>
          <div className="p-8 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Próxima Visita Agendada</h3>
                {!loadingVisita && proximaVisita && getDiasRestantesBadge(proximaVisita.vagas_configuracao?.data_visita)}
              </div>
              {proximaVisita && getStatusBadge(proximaVisita.status)}
            </div>

            {loadingVisita ? (
              <div className="space-y-4 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-24 mt-2" />
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ) : proximaVisita ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Data</p>
                    <p className="text-lg font-bold text-slate-900">{formatLocalDate(proximaVisita.vagas_configuracao?.data_visita)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Horário</p>
                    <p className="text-lg font-bold text-slate-900">{proximaVisita.vagas_configuracao?.horario?.substring(0, 5)}h</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Local</p>
                    <p className="text-lg font-bold text-slate-900">Galeria {proximaVisita.vagas_configuracao?.galeria}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Apenado</p>
                    <p className="text-lg font-bold text-slate-900 truncate capitalize" translate="no">{proximaVisita.nome_preso?.toLowerCase()}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Matrícula: {proximaVisita.matricula_preso}</p>
                  </div>
                </div>

                {(proximaVisita.visitante2_nome || proximaVisita.visitante3_nome) && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Acompanhantes Agendados</p>
                    <div className="flex flex-wrap gap-3">
                      {proximaVisita.visitante2_nome && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 py-1 capitalize font-medium" translate="no">
                          {proximaVisita.visitante2_nome.toLowerCase()}
                        </Badge>
                      )}
                      {proximaVisita.visitante3_nome && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 py-1 capitalize font-medium" translate="no">
                          {proximaVisita.visitante3_nome.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button onClick={() => setInfoModalType('presencial')} className="bg-[#2D5016] hover:bg-[#1f3a0f] text-white text-xs uppercase tracking-wider">Orientações Presencial</Button>
                  <Button onClick={() => setInfoModalType('video')} className="bg-[#2D5016] hover:bg-[#1f3a0f] text-white text-xs uppercase tracking-wider">Orientações Vídeo</Button>
                  <Button onClick={() => setInfoModalType('intima')} className="bg-[#2D5016] hover:bg-[#1f3a0f] text-white text-xs uppercase tracking-wider">Orientações Íntima</Button>
                  <Button onClick={() => setInfoModalType('menor')} className="bg-pink-600 hover:bg-pink-700 text-white text-xs uppercase tracking-wider">Orientações Menores</Button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 font-medium italic">Nenhuma visita futura agendada ou pendente.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProximaVisitaCard;
