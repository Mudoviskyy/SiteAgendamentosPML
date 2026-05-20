import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, History, CheckCircle, Plus, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import CarteirinhaDisplay from '@/components/visitante/CarteirinhaDisplay';

const formatLocalDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : '—';
  } catch (e) { return '—'; }
};

const isExpired = (validade) => {
  if (!validade) return false;
  const val = new Date(validade);
  val.setHours(23, 59, 59, 999);
  return val < new Date();
};

const VinculoCard = ({ vinculo }) => (
  <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden hover:shadow-md transition-shadow">
    <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-slate-100 p-2 rounded-lg">
          <User className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{vinculo.nome_apenado}</h4>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{vinculo.parentesco}</p>
        </div>
      </div>
      <Badge className={`
        ${vinculo.status === 'aprovado' ? 'bg-green-100 text-green-700' :
          vinculo.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} 
        border-none uppercase text-[9px] font-black px-2.5 py-1
      `}>
        {vinculo.status}
      </Badge>
    </CardHeader>
    <CardContent className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Protocolo</p>
          <p className="text-xs font-mono font-bold text-slate-700">{vinculo.protocolo}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Matrícula</p>
          <p className="text-xs font-bold text-slate-900">{vinculo.matricula_preso || '—'}</p>
        </div>
      </div>

      {(vinculo.status === 'recusado' || vinculo.status === 'cancelado') && vinculo.motivo_cancelamento && (
        <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
          <p className="text-[9px] font-black text-red-600 uppercase mb-1">Motivo do Indeferimento:</p>
          <p className="text-xs text-red-800 font-bold leading-relaxed">{vinculo.motivo_cancelamento}</p>
        </div>
      )}

      {vinculo.status === 'aprovado' && vinculo.validade && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase pt-2 border-t border-slate-50">
          <Clock className="w-3.5 h-3.5" />
          Válido até {formatLocalDate(vinculo.validade)}
        </div>
      )}
    </CardContent>
  </Card>
);

const CarteirinhasTab = ({ 
  carteirinhaAtiva, 
  masterCard, 
  podeRenovar, 
  diasRestantes, 
  setShowRequisitosModal,
  menores,
  vinculos,
  setShowVinculoModal,
  onAlterarParentesco,
  solicitacaoParentesco
}) => {
  const isMasterAmigo = masterCard?.status === 'aprovado' &&
    masterCard?.parentesco?.toLowerCase() === 'amigo(a)';

  const isParPendente = solicitacaoParentesco?.status === 'pendente';
  const isParRecusado = solicitacaoParentesco?.status === 'recusado' || solicitacaoParentesco?.status === 'cancelado';

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* SEÇÃO CARTEIRINHA PRINCIPAL */}
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 text-center">
            Carteirinha Principal (Mestre)
          </h3>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 max-w-5xl mx-auto">
            {carteirinhaAtiva && (
              <div className="flex-1 max-w-sm animate-in slide-in-from-left-4 duration-500">
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-2xl shadow-sm text-left">
                  <div className="flex items-center gap-3 mb-3 text-green-800">
                    <Mail className="w-5 h-5" />
                    <span className="font-bold uppercase text-[11px] tracking-wider">Aviso Importante</span>
                  </div>
                  <p className="text-sm text-green-700 leading-relaxed">
                    Sua carteirinha oficial foi enviada para seu e-mail. Esta exibição ao lado é apenas uma representação.
                  </p>
                </div>
              </div>
            )}
            <div className="shrink-0 flex flex-col items-center">
              <CarteirinhaDisplay data={masterCard} />
              
              {/* Botão de Alteração de Parentesco - visível apenas para amigo(a) aprovado */}
              {isMasterAmigo && (
                <div className="mt-6 w-full max-w-[300px] space-y-3">
                  <button
                    onClick={onAlterarParentesco}
                    disabled={isParPendente}
                    className={`w-full group flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm transition-all duration-200
                      ${isParPendente 
                        ? 'border-amber-200 text-amber-600 bg-amber-50/50 cursor-not-allowed' 
                        : 'border-rose-300 hover:border-rose-500 hover:bg-rose-50 text-rose-600 hover:text-rose-700'
                      }`}
                  >
                    {isParPendente ? (
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    )}
                    {isParPendente ? 'Alteração em Análise' : 'Atualizar Parentesco'}
                  </button>

                  {/* Feedback da Solicitação PAR- */}
                  {solicitacaoParentesco && (
                    <div className={`p-4 rounded-xl border text-center animate-in fade-in slide-in-from-top-2
                      ${isParPendente ? 'bg-amber-50 border-amber-100' : 
                        isParRecusado ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {isParPendente ? (
                          <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-black">PENDENTE</Badge>
                        ) : isParRecusado ? (
                          <Badge className="bg-red-100 text-red-700 border-none text-[9px] font-black">
                            {solicitacaoParentesco.status.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-none text-[9px] font-black">
                            {solicitacaoParentesco.status.toUpperCase()}
                          </Badge>
                        )}
                        <span className="text-[9px] font-mono font-bold text-slate-400">{solicitacaoParentesco.protocolo}</span>
                      </div>

                      {isParRecusado && solicitacaoParentesco.motivo_cancelamento && (
                        <p className="text-[11px] text-red-800 font-bold leading-tight mt-2">
                          Motivo: {solicitacaoParentesco.motivo_cancelamento}
                        </p>
                      )}
                      
                      {isParPendente && (
                        <p className="text-[10px] text-amber-700 font-bold leading-tight">
                          Sua solicitação de mudança para {solicitacaoParentesco.parentesco_solicitado} está sendo analisada.
                        </p>
                      )}

                      {!isParPendente && !isParRecusado && solicitacaoParentesco.status === 'aprovado' && (
                        <p className="text-[10px] text-green-700 font-bold leading-tight">
                          Solicitação aprovada! Seu parentesco foi atualizado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-8 border-t border-slate-100">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center md:text-left space-y-3">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Solicitação e Renovação</h2>
              <div className="flex flex-col md:flex-row md:items-center pt-1">
                <span className="inline-flex items-center bg-red-600 text-white text-[10px] px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider shadow-sm border border-red-700">
                  Prazo de confecção das carteirinhas novas ou renovação: 20 dias
                </span>
              </div>
            </div>

            {!podeRenovar && carteirinhaAtiva && (
              <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="bg-blue-500 p-2 rounded-xl shrink-0 mt-0.5"><Clock className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Validade Ativa</p>
                  <p className="text-[13px] text-blue-700 leading-relaxed">Sua carteirinha ainda está válida por mais <strong>{diasRestantes} dias</strong>.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild disabled={!podeRenovar} className={`flex-1 h-14 font-black uppercase text-xs tracking-widest shadow-lg rounded-xl transition-all ${podeRenovar ? 'bg-[#2D5016] hover:bg-[#1f3810] text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed border-none'}`}>
                {podeRenovar ? (
                  <Link to="/carteirinha" className="flex items-center justify-center"><Plus className="w-4 h-4 mr-2" /> Iniciar Nova Solicitação</Link>
                ) : (
                  <span className="flex items-center justify-center">Solicitação Bloqueada</span>
                )}
              </Button>
              <Button onClick={() => setShowRequisitosModal(true)} variant="ghost" className="flex-1 h-14 border-2 border-slate-100 font-bold uppercase text-[10px] tracking-widest text-slate-500 rounded-xl hover:bg-slate-100">
                Requisitos de Documentos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO CARTEIRINHA DE MENOR */}
      {carteirinhaAtiva && (
        <div className="space-y-4 mb-8">
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-r from-pink-50 to-white overflow-hidden border-l-4 border-l-pink-500">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-pink-800 uppercase tracking-tight">Carteirinhas para Menores de Idade</h3>
                  </div>
                  <p className="text-sm text-pink-700">Solicite carteirinha para menores de idade vinculados ao mesmo detento. Apenas responsável legal pode solicitar.</p>
                </div>
                  {menores.filter(m => m.status === 'pendente').length >= 3 ? (
                    <Button disabled className="bg-slate-300 text-slate-500 font-bold uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-none shrink-0 cursor-not-allowed">
                      Limite Atingido (3)
                    </Button>
                  ) : (
                    <Button asChild className="bg-pink-600 hover:bg-pink-700 text-white font-bold uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-lg shrink-0">
                      <Link to="/carteirinha-menor">Nova Solicitação</Link>
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>

          {menores.length > 0 && (
            <div className="space-y-6">
              {/* MENORES APROVADOS E ATIVOS */}
              {menores.filter(m => m.status === 'aprovado' && !isExpired(m.validade)).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                    <div className="bg-green-100 p-1 rounded-md"><CheckCircle className="w-3.5 h-3.5" /></div>
                    Menores Vinculados Ativos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menores.filter(m => m.status === 'aprovado' && !isExpired(m.validade)).map(menor => (
                      <Card key={menor.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-l-green-500">
                        <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg">
                              <User className="w-4 h-4 text-pink-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{menor.nome_menor || menor.nome}</h4>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Menor Vinculado</p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-none uppercase text-[9px] font-black px-2.5 py-1">APROVADO</Badge>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Protocolo</p>
                              <p className="text-xs font-mono font-bold text-slate-700">{menor.protocolo}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Apenado</p>
                              <p className="text-xs font-bold text-slate-900">{menor.nome_apenado || '—'}</p>
                            </div>
                          </div>
                          {menor.validade && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase pt-2 border-t border-slate-50">
                              <Clock className="w-3.5 h-3.5" />
                              Válido até {formatLocalDate(menor.validade)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* MENORES PENDENTES */}
              {menores.filter(m => m.status === 'pendente').length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="bg-yellow-100 p-1 rounded-md"><Clock className="w-3.5 h-3.5" /></div>
                    Solicitações em Análise
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menores.filter(m => m.status === 'pendente').map(menor => (
                      <Card key={menor.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-l-yellow-400">
                        <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg">
                              <User className="w-4 h-4 text-pink-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{menor.nome_menor || menor.nome}</h4>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Menor Vinculado</p>
                            </div>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-700 border-none uppercase text-[9px] font-black px-2.5 py-1">PENDENTE</Badge>
                        </CardHeader>
                        <CardContent className="p-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Protocolo</p>
                              <p className="text-xs font-mono font-bold text-slate-700">{menor.protocolo}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Apenado</p>
                              <p className="text-xs font-bold text-slate-900">{menor.nome_apenado || '—'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* MENORES RECUSADOS OU VENCIDOS */}
              {menores.filter(m => m.status === 'recusado' || m.status === 'cancelado' || (m.status === 'aprovado' && isExpired(m.validade))).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-md"><History className="w-3.5 h-3.5" /></div>
                    Histórico de Solicitações (Menores)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menores.filter(m => m.status === 'recusado' || m.status === 'cancelado' || (m.status === 'aprovado' && isExpired(m.validade))).map(menor => (
                      <Card key={menor.id} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden border-l-4 border-l-slate-300 opacity-80">
                        <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg">
                              <User className="w-4 h-4 text-pink-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{menor.nome_menor || menor.nome}</h4>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Menor Vinculado</p>
                            </div>
                          </div>
                          <Badge className={`${isExpired(menor.validade) && menor.status === 'aprovado' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'} border-none uppercase text-[9px] font-black px-2.5 py-1`}>
                            {isExpired(menor.validade) && menor.status === 'aprovado' ? 'VENCIDO' : menor.status}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Protocolo</p>
                              <p className="text-xs font-mono font-bold text-slate-700">{menor.protocolo}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Apenado</p>
                              <p className="text-xs font-bold text-slate-900">{menor.nome_apenado || '—'}</p>
                            </div>
                          </div>
                          {menor.motivo_cancelamento && (
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                              <p className="text-[9px] font-black text-red-600 uppercase mb-1">Motivo do Indeferimento:</p>
                              <p className="text-xs text-red-800 font-bold leading-relaxed">{menor.motivo_cancelamento}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Vínculos Adicionais</h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase">Internos vinculados à sua identidade verificada</p>
          </div>
          <Button
            onClick={() => setShowVinculoModal(true)}
            disabled={!carteirinhaAtiva}
            className="bg-[#2D5016] hover:bg-[#1f3810] text-white font-bold uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" /> Acrescentar Vínculo
          </Button>
        </div>

        {vinculos.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200 bg-white/50 p-12 text-center rounded-2xl">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium italic text-sm">Você não possui outros vínculos cadastrados.</p>
            <p className="text-[10px] text-slate-400 uppercase mt-1">Apenas visitantes com carteirinha ativa podem adicionar novos detentos.</p>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* VÍNCULOS ATIVOS */}
            {vinculos.filter(v => v.status === 'aprovado' && !isExpired(v.validade)).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[#2D5016] uppercase tracking-widest flex items-center gap-2 group cursor-default">
                  <div className="bg-green-100 p-1 rounded-md"><CheckCircle className="w-3.5 h-3.5" /></div>
                  Meus Vínculos Ativos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vinculos.filter(v => v.status === 'aprovado' && !isExpired(v.validade)).map((v) => (
                    <VinculoCard key={v.id} vinculo={v} />
                  ))}
                </div>
              </div>
            )}

            {/* EM ANÁLISE */}
            {vinculos.filter(v => v.status === 'pendente').length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <div className="bg-amber-100 p-1 rounded-md"><Clock className="w-3.5 h-3.5" /></div>
                  Solicitações em Análise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vinculos.filter(v => v.status === 'pendente').map((v) => (
                    <VinculoCard key={v.id} vinculo={v} />
                  ))}
                </div>
              </div>
            )}

            {/* HISTÓRICO VINCULOS */}
            {vinculos.filter(v => v.status === 'recusado' || v.status === 'cancelado' || (v.status === 'aprovado' && isExpired(v.validade))).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="bg-slate-100 p-1 rounded-md"><History className="w-3.5 h-3.5" /></div>
                  Histórico de Solicitações (Vínculos)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vinculos.filter(v => v.status === 'recusado' || v.status === 'cancelado' || (v.status === 'aprovado' && isExpired(v.validade))).map((v) => (
                    <VinculoCard key={v.id} vinculo={v} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarteirinhasTab;
