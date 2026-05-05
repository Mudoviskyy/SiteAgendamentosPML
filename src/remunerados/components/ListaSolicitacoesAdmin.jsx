
import React, { useEffect } from 'react';
import { useRemunerados } from '../hooks/useRemunerados';
import { formatarHorasMinutos } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RefusalModal from './RefusalModal';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

const ListaSolicitacoesAdmin = () => {
  const { solicitacoesBancoHoras, fetchSolicitacoesAdmin, aprovarSolicitacao, recusarSolicitacao, loading } = useRemunerados();

  const [searchNome, setSearchNome] = useState('');
  const [searchMatricula, setSearchMatricula] = useState('');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [anoFiltro, setAnoFiltro] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchSolicitacoesAdmin();
  }, [fetchSolicitacoesAdmin]);

  const [showRefusalModal, setShowRefusalModal] = React.useState(false);
  const [selectedSol, setSelectedSol] = React.useState(null);

  const handleAction = async (action, sol) => {
    if (action === 'aprovar') {
      await aprovarSolicitacao(sol.id, sol.servidor_id, sol.horas);
    } else {
      setSelectedSol(sol);
      setShowRefusalModal(true);
    }
  };

  const handleConfirmRefuse = async (motivo) => {
    if (selectedSol) {
      await recusarSolicitacao(selectedSol.id, motivo);
      setShowRefusalModal(false);
      setSelectedSol(null);
      fetchSolicitacoesAdmin();
    }
  };

  const filtrados = useMemo(() => {
    return solicitacoesBancoHoras.filter(sol => {
      const matchNome = !searchNome || sol.servidor_nome?.toLowerCase().includes(searchNome.toLowerCase());
      const matchMatricula = !searchMatricula || sol.servidor_matricula?.includes(searchMatricula);
      
      const date = new Date(sol.created_at);
      const m = (date.getMonth() + 1).toString();
      const y = date.getFullYear().toString();
      
      const matchMes = mesFiltro === 'todos' || m === mesFiltro;
      const matchAno = anoFiltro === 'todos' || y === anoFiltro;

      return matchNome && matchMatricula && matchMes && matchAno;
    });
  }, [solicitacoesBancoHoras, searchNome, searchMatricula, mesFiltro, anoFiltro]);

  useEffect(() => {
    setPagina(1);
  }, [searchNome, searchMatricula, mesFiltro, anoFiltro]);

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const itensExibidos = filtrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-green-500">Aprovado</Badge>;
      case 'recusado': return <Badge variant="destructive">Recusado</Badge>;
      default: return <Badge className="bg-yellow-500">Pendente</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-sm mt-6">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>Solicitações de Banco de Horas</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input 
              placeholder="Nome..." 
              className="pl-7 h-8 w-full rounded-md border border-gray-200 text-xs"
              value={searchNome}
              onChange={e => setSearchNome(e.target.value)}
            />
          </div>
          <input 
            placeholder="Matrícula..." 
            className="h-8 w-full rounded-md border border-gray-200 text-xs px-2"
            value={searchMatricula}
            onChange={e => setSearchMatricula(e.target.value)}
          />
          <select 
            className="h-8 w-full rounded-md border border-gray-200 text-xs px-1"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
          >
            <option value="todos">Todos Meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={(i+1).toString()}>
                {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
              </option>
            ))}
          </select>
          <select 
            className="h-8 w-full rounded-md border border-gray-200 text-xs px-1"
            value={anoFiltro}
            onChange={e => setAnoFiltro(e.target.value)}
          >
            <option value="todos">Todos Anos</option>
            {[2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading && filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Carregando solicitações...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Servidor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensExibidos.map((sol) => (
                  <TableRow key={sol.id}>
                    <TableCell>{format(new Date(sol.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{sol.servidor_nome || 'Desconhecido'}</span>
                        {sol.servidor_plantao && (
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                            {sol.servidor_plantao}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-normal">{sol.servidor_matricula || '-'}</div>
                    </TableCell>
                    <TableCell className="capitalize">{sol.tipo}</TableCell>
                    <TableCell>{formatarHorasMinutos(sol.horas)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={sol.motivo}>{sol.motivo}</TableCell>
                    <TableCell>{getStatusBadge(sol.status)}</TableCell>
                    <TableCell className="text-right">
                      {sol.status === 'pendente' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                            onClick={() => handleAction('aprovar', sol)}
                            disabled={loading}
                          >
                            Aprovar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            onClick={() => handleAction('recusar', sol)}
                            disabled={loading}
                          >
                            Recusar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-gray-500">
                  Página {pagina} de {totalPaginas} ({filtrados.length} registros)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)} className="h-8 text-xs">Anterior</Button>
                  <Button variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)} className="h-8 text-xs">Próxima</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <RefusalModal 
        isOpen={showRefusalModal}
        onClose={() => setShowRefusalModal(false)}
        onConfirm={handleConfirmRefuse}
        title="Recusar Solicitação de Horas"
        loading={loading}
      />
    </Card>
  );
};

export default ListaSolicitacoesAdmin;
