import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Search, CheckCircle, XCircle, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Mail, Phone, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const fixEncoding = (text) => {
  if (typeof text !== 'string') return text;
  try {
    if (text.includes('Ã') || text.includes('Â') || text.includes('Ã§') || text.includes('Ã£')) {
      return decodeURIComponent(escape(text));
    }
  } catch (e) {}
  return text;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [deletionDeps, setDeletionDeps] = useState(null);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const { toast } = useToast();

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0)

  console.log("USER ID:", selectedUser?.id);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('perfis')
        .select('*', { count: 'exact' })
        .eq('role', 'visitante');

      if (statusFilter === 'todos') {
        query = query
          .order('aprovado', { ascending: true }) 
          .order('created_at', { ascending: true }); 
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (statusFilter !== 'todos') {
        const isApproved = statusFilter === 'aprovado';
        query = query.eq('aprovado', isApproved);
      }

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }

      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error) {
        setUsers(data || []);
        setTotalRecords(count || 0);
      } else {
        throw error;
      }
    } catch (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchTerm, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchTerm, pageSize]);

  const checkDependencies = async (userId) => {
    setCheckingDeps(true);
    try {
      const [agendamentos, carteirinhas] = await Promise.all([
        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('id_visitante', userId),
        supabase.from('carteirinhas').select('id', { count: 'exact', head: true }).eq('usuario_id', userId)
      ]);

      setDeletionDeps({
        agendamentos: agendamentos.count || 0,
        carteirinhas: carteirinhas.count || 0,
        isSafe: (agendamentos.count || 0) === 0 && (carteirinhas.count || 0) === 0
      });
    } catch (error) {
      toast({ title: "Erro ao verificar vínculos", variant: "destructive" });
    } finally {
      setCheckingDeps(false);
    }
  };

  const handleOpenAction = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    if (type === 'reject') checkDependencies(user.id);
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'approve') {
        const { error } = await supabase
          .from('perfis')
          .update({ aprovado: true })
          .eq('id', selectedUser.id);

        if (error) throw error;

        toast({
          title: "Usuário aprovado!",
          className: "bg-[#2D5016] text-white border-none"
        });
      } else {
        // 🔥 EXCLUSÃO COMPLETA VIA EDGE FUNCTION
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              user_id: selectedUser.id
            })
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "Erro ao excluir usuário");
        }

        toast({
          title: "Usuário removido com sucesso",
          className: "bg-[#2D5016] text-white border-none"
        });
      }

      fetchUsers();
      closeModal();

    } catch (error) {
      toast({
        title: "Erro na operação",
        description: error.message || "Falha ao processar ação",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setDeletionDeps(null);
  };

  return (
    <div className="space-y-4">
      {/* Header com Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            className="pl-8 bg-white border-gray-200 text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-200">
            <SelectValue placeholder="Filtrar Status" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="todos">Todos os Perfis</SelectItem>
            <SelectItem value="pendente">Apenas Pendentes</SelectItem>
            <SelectItem value="aprovado">Apenas Aprovados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3">

        {/* BLOCO ESQUERDO - AMBAR */}
        <div className="flex items-start gap-3 w-full md:w-1/2 bg-amber-50 border border-amber-200 p-3 rounded-lg">
          <div className="bg-amber-500 p-2 rounded-full mt-1">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-amber-900 leading-snug">
            ATENÇÃO:{" "}
            <span className="font-medium text-amber-800">
              Consulte o nome e CPF no <strong className="underline">I-Pen</strong> para certificar de que o novo usuário tem um parente no sistema prisional. CPF está somente números para copiar e colar na busca do I-pen
            </span>
          </p>
        </div>

        {/* BLOCO DIREITO - VERMELHO */}
        <div className="flex items-start gap-3 w-full md:w-1/2 bg-red-50 border border-red-200 p-3 rounded-lg">
          <div className="bg-red-500 p-2 rounded-full mt-1">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-red-700 leading-snug">
            ATENÇÃO:{" "}
            <span className="font-medium text-red-600">
              Verificar data de nascimento para o caso de{" "}
              <strong className="underline">MENORES</strong>, recusar o cadastro.
            </span>
          </p>
        </div>

      </div>

      {/* Tabela de Usuários */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold text-gray-700">Visitante</TableHead>
              <TableHead className="font-bold text-gray-700">Contato</TableHead>
              <TableHead className="font-bold text-gray-700">CPF</TableHead>
              <TableHead className="font-bold text-gray-700">Nascimento</TableHead>
              <TableHead className="font-bold text-gray-700">Status</TableHead>
              <TableHead className="text-right font-bold text-gray-700">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto text-[#2D5016]" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.aprovado ? 'border-l-4 border-l-yellow-400' : ''}`}>
                  <TableCell className="py-4">
                    <div className="font-bold text-gray-900">{fixEncoding(user.nome)}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Desde: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '---'}</div>
                  </TableCell>
                  <TableCell className="py-4 text-xs space-y-1">
                    <div className="flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3 text-gray-400" /> {user.email}</div>
                    <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3 text-gray-400" /> {user.telefone || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="py-4 font-medium text-gray-700 select-all">{user.cpf?.replace(/\D/g, '')}</TableCell>
                  <TableCell className="py-4 font-medium text-gray-700">
                    {user.data_nascimento ? user.data_nascimento.split('-').reverse().join('/') : '---'}
                  </TableCell>
                  <TableCell className="py-4">
                    {user.aprovado ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 uppercase text-[10px] font-black">Aprovado</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 uppercase text-[10px] font-black">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4 space-x-2">
                    {!user.aprovado && (
                      <Button
                        size="sm"
                        className="bg-[#2D5016] hover:bg-[#1f3810] text-white text-[10px] font-bold uppercase"
                        onClick={() => handleOpenAction(user, 'approve')}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-100 hover:bg-red-50 text-[10px] font-bold uppercase"
                      onClick={() => handleOpenAction(user, 'reject')}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500">Total: <span className="text-gray-900 font-bold">{totalRecords}</span> usuários</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold text-[#2D5016] bg-green-50 px-3 py-1 rounded-md border border-green-100">Página {page + 1} de {Math.ceil(totalRecords / pageSize) || 1}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalRecords || loading}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
          <SelectTrigger className="w-[80px] h-8 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="bg-white border-0 max-w-md rounded-xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {actionType === 'approve' ? (
                <><CheckCircle className="text-[#2D5016] w-6 h-6" /> Aprovar Visitante</>
              ) : (
                <><AlertTriangle className="text-red-600 w-6 h-6" /> Rejeitar e Remover</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-600 text-sm leading-relaxed">
              {actionType === 'approve' ? (
                <>Deseja conceder permissão de acesso ao sistema para <strong>{selectedUser?.nome}</strong>?</>
              ) : (
                <>Esta ação removerá permanentemente o perfil de <strong>{selectedUser?.nome}</strong>. Esta operação é irreversível.</>
              )}
            </p>

            {actionType === 'reject' && (
              <div className="mt-4">
                {checkingDeps ? (
                  <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Verificando vínculos...</div>
                ) : deletionDeps && (
                  <div className={`p-3 rounded-lg text-[11px] ${deletionDeps.isSafe ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="font-bold mb-1 uppercase tracking-wider">{deletionDeps.isSafe ? 'Liberado para Exclusão' : 'Bloqueio de Integridade'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <span>Agendamentos: {deletionDeps.agendamentos}</span>
                      <span>Carteirinhas: {deletionDeps.carteirinhas}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeModal} className="text-gray-500">Cancelar</Button>
            <Button
              className={actionType === 'approve' ? 'bg-[#2D5016] hover:bg-[#1f3810] text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={handleAction}
              disabled={(actionType === 'reject' && (!deletionDeps?.isSafe)) || actionLoading}
            >
              {actionLoading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              {actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;