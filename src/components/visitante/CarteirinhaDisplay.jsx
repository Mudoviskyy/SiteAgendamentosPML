
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, QrCode, BadgeCheck, Calendar, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { getIdentificacaoLabel } from '@/utils/identificacao';

const CarteirinhaDisplay = ({ data = null }) => {
  const { user, profile } = useAuth();
  const [carteirinha, setCarteirinha] = useState(data);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) {
      setCarteirinha(data);
      setLoading(false);
      return;
    }

    const fetchCarteirinha = async () => {
      if (!user) return;

      const { data: master, error } = await supabase
        .from('carteirinhas')
        .select('*')
        .eq('usuario_id', user.id)
        .not('protocolo', 'ilike', 'VIN-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && master) {
        setCarteirinha(master);
      }

      setLoading(false);
    };

    fetchCarteirinha();
  }, [user, data]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  if (!carteirinha) {
    return (
      <div className="text-center p-8 text-gray-500">
        Nenhuma carteirinha encontrada.
      </div>
    );
  }

  const isRejectedOrCanceled = carteirinha.status === 'cancelado' || carteirinha.status === 'recusado';

  const statusColors = {
    aprovado: 'bg-green-400 text-green-900',
    pendente: 'bg-yellow-400 text-yellow-900',
    recusado: 'bg-red-400 text-red-900',
    cancelado: 'bg-red-600 text-white'
  };

  // Label baseado no perfil atual
  const labelDocumento = profile?.tipo_identificacao ? getIdentificacaoLabel(profile.tipo_identificacao) : 'CPF';

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-full max-w-md mx-auto">
        <div className={`relative bg-gradient-to-br ${isRejectedOrCanceled ? 'from-red-900 to-red-950 border-red-700' : 'from-[#2D5016] to-[#1a330a] border-[#3e6b1f]'} rounded-xl shadow-2xl overflow-hidden text-white border`}>

          <div className="relative p-6 space-y-6">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/20 pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold tracking-wider uppercase">
                  Cartão de Acesso
                </h2>
                <p className={`text-xs ${isRejectedOrCanceled ? 'text-red-200' : 'text-green-100'} opacity-80`}>
                  Presídio Masculino de Lages
                </p>
              </div>
              <BadgeCheck className={`w-8 h-8 ${isRejectedOrCanceled ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>

            {/* Content */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-24 h-32 bg-white/10 rounded-lg flex items-center justify-center border-2 border-dashed border-white/30 backdrop-blur-sm">
                  <User className="w-12 h-12 text-white/50" />
                </div>
              </div>

              <div className="flex-1 space-y-3 pt-1">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isRejectedOrCanceled ? 'text-red-200' : 'text-green-200'}`}>
                    Nome
                  </p>

                  <p className="font-bold text-lg leading-tight" translate="no">
                    {carteirinha.nome}
                  </p>
                </div>

                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isRejectedOrCanceled ? 'text-red-200' : 'text-green-200'}`}>
                    {labelDocumento}
                  </p>
                  <p className="font-mono text-base">
                    {carteirinha.cpf}
                  </p>
                </div>

                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColors[carteirinha.status]}`} translate="no">
                    {carteirinha.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end border-t border-white/20 pt-4">
              <div>
                <p className={`text-[10px] uppercase tracking-wider ${isRejectedOrCanceled ? 'text-red-200' : 'text-green-200'} flex items-center gap-1`}>
                  <Calendar className="w-3 h-3" /> Validade
                </p>
                <p className="text-sm font-medium">
                  {formatDate(carteirinha.validade)}
                </p>
              </div>

              <div className="text-right">
                <QrCode className="w-12 h-12 text-white bg-white/10 p-1 rounded" />
                <p className={`text-[9px] ${isRejectedOrCanceled ? 'text-red-200' : 'text-green-200'} mt-1 font-mono tracking-widest`}>
                  {carteirinha.protocolo}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SEÇÃO DO MOTIVO */}
      {isRejectedOrCanceled && carteirinha.motivo_cancelamento && (
        <div className="w-full max-w-md mt-4">
          <div className="bg-white border-l-8 border-red-800 p-6 shadow-lg rounded-r-lg shadow-red-100">

            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-800" />
              <h3 className="text-red-900 font-bold text-sm uppercase tracking-widest">
                Sua última solicitação foi recusada!
              </h3>
            </div>

            <div className="bg-red-50 p-4 rounded border border-red-200">
              <p className="text-red-900 text-xs font-semibold uppercase mb-1">
                Motivo do {carteirinha.status === 'recusado' ? 'Indeferimento' : 'Cancelamento'}:
              </p>
              <p className="text-red-950 text-base font-medium leading-relaxed">
                {carteirinha.motivo_cancelamento}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-gray-500 text-[10px] uppercase font-bold">
                Há pendências para regularizar a carteirinha.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarteirinhaDisplay;
