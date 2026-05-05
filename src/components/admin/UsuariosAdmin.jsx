/*import React, { useEffect, useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Check, X, Calendar, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UsuariosAdmin = () => {
  const { usuarios, loading, error, fetchPendentes, aprovarUsuario, recusarUsuario, total } = useUsers();
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchPendentes(page, limit);
  }, [page, fetchPendentes]);

  const totalPages = Math.ceil(total / limit);

  // Handlers for pagination
  const handleNextPage = () => {
    if (page + 1 < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Aprovações Pendentes
        </h2>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
          {total} pendentes
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : usuarios.length === 0 ? (
        <Card className="bg-gray-50 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
            <User className="w-16 h-16 mb-4 opacity-20 text-slate-900" />
            <p className="text-xl font-bold text-slate-900">
              Nenhum usuário pendente
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {usuarios.map((user) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="space-y-2">
                          <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                            {user.nome || 'Nome não informado'}
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {user.role}
                            </span>
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">CPF:</span> {user.cpf}
                            </p>
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" /> {user.email}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" /> {user.telefone || 'N/A'}
                            </p>
                            <p className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(user.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-row lg:flex-col gap-3 justify-end min-w-[140px]">
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                            onClick={() => aprovarUsuario(user.id)}
                          >
                            <Check className="w-4 h-4 mr-2" /> Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 w-full"
                            onClick={() => recusarUsuario(user.id)}
                          >
                            <X className="w-4 h-4 mr-2" /> Recusar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-lg border shadow-sm">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={handlePrevPage}
                className="w-32"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
              </Button>

              <span className="text-sm font-medium text-gray-600">
                Página {page + 1} de {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={page + 1 >= totalPages}
                onClick={handleNextPage}
                className="w-32"
              >
                Próxima <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsuariosAdmin;*/