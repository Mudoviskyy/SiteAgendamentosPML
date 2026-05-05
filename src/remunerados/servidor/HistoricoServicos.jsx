
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRemunerados } from '../hooks/useRemunerados';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const HistoricoServicos = ({ servidorId }) => {
  const { servicos, fetchServicos, loading, cancelarServicoServidor } = useRemunerados();
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    if (servidorId) {
      fetchServicos(servidorId);
    }
  }, [servidorId, fetchServicos]);

  const filtrados = servicos.filter(s => {
    if (filtroTipo !== 'todos' && s.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
    return true;
  });

  // Resetar página ao filtrar
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroTipo, filtroStatus]);

  const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const itensExibidos = filtrados.slice(inicio, fim);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aprovado': return <Badge className="bg-green-600">Aprovado</Badge>;
      case 'recusado': return <Badge className="bg-red-600">Recusado</Badge>;
      case 'pendente': return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'reagendado': return <Badge className="bg-blue-600">Reagendado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Histórico de Solicitações</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="w-1/2">
             <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Filtrar por Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="RD">RD</SelectItem>
                  <SelectItem value="RN">RN</SelectItem>
                </SelectContent>
              </Select>
          </div>
          <div className="w-1/2">
             <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Filtrar por Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="recusado">Recusados</SelectItem>
                  <SelectItem value="reagendado">Reagendados</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-[#2D5016]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensExibidos.length > 0 ? (
                  itensExibidos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell>{new Date(servico.data + 'T12:00:00Z').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-bold">{servico.tipo}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-600">{servico.turno || '-'}</TableCell>
                      <TableCell>{getStatusBadge(servico.status)}</TableCell>
                      <TableCell className="text-gray-500 text-sm max-w-xs truncate">
                        {servico.observacao || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {servico.status === 'pendente' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              if(window.confirm('Deseja realmente cancelar este agendamento?')) {
                                const res = await cancelarServicoServidor(servico.id);
                                if(res.success) fetchServicos(servidorId);
                              }
                            }} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Controles de Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-sm text-gray-500">
                  Página {paginaAtual} de {totalPaginas} ({filtrados.length} registros)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricoServicos;
