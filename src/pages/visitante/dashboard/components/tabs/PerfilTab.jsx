import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, PlayCircle, Mail, Bug } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { getIdentificacaoLabel, getTelefoneExibivel } from '@/utils/identificacao';

const formatLocalDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return isValid(date) ? format(date, 'dd/MM/yyyy') : '—';
  } catch (e) { return '—'; }
};

const PerfilTab = ({
  user,
  profile,
  setShowVideoModal
}) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="border-b border-slate-50 px-8 py-6">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Informações de Cadastro</CardTitle>
          </CardHeader>
          <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nome Completo</label>
              <p className="font-bold text-slate-900 uppercase">{profile?.nome || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mail de Acesso</label>
              <p className="font-bold text-slate-900">{user?.email}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {profile?.tipo_identificacao ? getIdentificacaoLabel(profile.tipo_identificacao) : 'CPF'}
              </label>
              <p className="font-mono font-bold text-slate-700">{profile?.cpf || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Telefone/WhatsApp</label>
              <p className="font-bold text-slate-900">
                {profile?.telefone ? getTelefoneExibivel(profile.telefone, profile.tipo_telefone) : '—'}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Data de Nascimento</label>
              <p className="font-bold text-slate-900">{profile?.data_nascimento ? formatLocalDate(profile.data_nascimento) : '—'}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="border-b border-slate-50 px-8 py-6">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">STATUS GERAL DO SEU PERFIL</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil</span>
              {profile?.aprovado ? (
                <Badge className="bg-green-100 text-green-700 border-none px-4 py-1.5 font-black text-[10px] w-fit uppercase">Cadastro Aprovado</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1.5 font-black text-[10px] w-fit uppercase">Em Análise</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 text-slate-400">
                <AlertCircle className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Segurança e Integridade dos Dados</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Por diretrizes de segurança, o <strong className="text-slate-900">E-mail de Acesso</strong> e o <strong className="text-slate-900">CPF</strong> são registros permanentes e <span className="font-bold underline decoration-slate-300">não podem ser alterados</span>. 
              </p>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                <p className="text-[13px] text-slate-600">
                  A manutenção do acesso ao seu e-mail é de sua inteira responsabilidade. A perda do acesso ao e-mail cadastrado resultará na <strong className="text-slate-900">perda irrevogável da conta e de todos os agendamentos realizados</strong>.
                </p>
                <p className="text-[11px] text-slate-500 italic leading-snug">
                  Caso ocorra a perda do acesso, será necessário formalizar uma nova solicitação diretamente ao Setor Social para análise de um novo cadastro. Este processo envolve a exclusão manual dos dados anteriores, o que é um procedimento administrativo demorado.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto min-w-[220px]">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 hidden lg:block">Suporte ao Sistema</p>
              <Button
                variant="ghost"
                onClick={() => setShowVideoModal(true)}
                className="justify-start h-10 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-wider"
              >
                <PlayCircle className="w-4 h-4 mr-3" /> Guia de Agendamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerfilTab;
