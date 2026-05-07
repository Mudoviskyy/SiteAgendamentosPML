import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, FileText, CheckCircle, Clock, CalendarDays, Loader2,
  AlertCircle, TrendingUp, Calendar, HardDrive, Database, Activity,
  Globe, Zap, Cpu, Table2, UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { addLog, measurePerf } from '@/utils/logger';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CalendarioAdmin from '../CalendarioAdmin';

const Dashboard = ({ onNavigateTab }) => {
  const { onlineUsers } = useAuth();

  const [stats, setStats] = useState({
    usuariosAprovados: 0,
    usuariosPendentes: 0,
    agendamentosHoje: 0,
    carteirinhasPendentes: 0,
    taxaOcupacao: 0,
    agendamentosMes: 0
  });

  const [limits, setLimits] = useState({
    dbSize: 0,
    storageSize: 0,
    bandwidth: 0
  });

  const [systemMetrics, setSystemMetrics] = useState({
    connections: 0,
    max_connections: 60,
    cache_hit_ratio: 0,
    mau: 0,
    mau_limit: 50000,
    shared_buffers_mb: 0,
    table_sizes: []
  });

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    await measurePerf('DASHBOARD_FETCH_ALL_STATS', async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const fetchCounts = async () => {
          const [uAprov, uPend, cPend] = await Promise.all([
            supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('role', 'visitante').eq('aprovado', true),
            supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('role', 'visitante').eq('aprovado', false),
            supabase.from('carteirinhas').select('id', { count: 'exact', head: true }).eq('status', 'pendente')
          ]);
          return { uAprov, uPend, cPend };
        };

        const fetchSystemHealth = async () => {
          try {
            const [{ data: dbMB }, { data: storageBytes }, { data: metrics }] = await Promise.all([
              supabase.rpc('get_database_size_mb'),
              supabase.rpc('get_storage_size_bytes'),
              supabase.rpc('get_system_metrics')
            ]);
            if (metrics) setSystemMetrics(metrics);
            return {
              dbSize: dbMB || 0,
              storageSize: (storageBytes || 0) / (1024 * 1024)
            };
          } catch (e) {
            addLog('DASHBOARD_HEALTH_RPC_ERROR', { error: e.message }, 'WARN');
            return { dbSize: 0, storageSize: 0 };
          }
        };

        const [counts, health] = await Promise.all([fetchCounts(), fetchSystemHealth()]);
        setLimits(prev => ({ ...prev, ...health }));

        const { data: vagasHoje } = await supabase.from('vagas_configuracao').select('id').eq('data_visita', today);
        let aHoje = 0;
        if (vagasHoje && vagasHoje.length > 0) {
          const ids = vagasHoje.map(v => v.id);
          const { count } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true }).in('vaga_configuracao_id', ids).in('status', ['pendente', 'aprovado']);
          aHoje = count || 0;
        }

        const { data: vagasMes, error: e5 } = await supabase.from('vagas_configuracao').select('id, vagas_totais').gte('data_visita', monthStart).lte('data_visita', monthEnd);
        let tOcupacao = 0;
        let totalAgendamentosMes = 0;

        if (!e5 && vagasMes && vagasMes.length > 0) {
          const vagasIds = vagasMes.map(v => v.id);
          const totalVagas = vagasMes.reduce((acc, curr) => acc + curr.vagas_totais, 0);
          const { data: agendamentosMesData } = await supabase.from('agendamentos').select('id').in('vaga_configuracao_id', vagasIds).eq('status', 'aprovado');
          if (agendamentosMesData) {
            totalAgendamentosMes = agendamentosMesData.length;
            tOcupacao = totalVagas > 0 ? Math.round((totalAgendamentosMes / totalVagas) * 100) : 0;
          }
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        const start6M = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1).toISOString().split('T')[0];
        const { data: allVagas6m } = await supabase.from('vagas_configuracao').select('id, data_visita').gte('data_visita', start6M);
        const historyData = [];

        if (allVagas6m && allVagas6m.length > 0) {
          const ids6m = allVagas6m.map(v => v.id);
          const { data: agendamentos6m } = await supabase.from('agendamentos').select('vaga_configuracao_id').in('vaga_configuracao_id', ids6m).eq('status', 'aprovado');
          if (agendamentos6m) {
            const vagaToDate = allVagas6m.reduce((acc, v) => { acc[v.id] = v.data_visita; return acc; }, {});
            const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const aggs = {};
            for (let i = 5; i >= 0; i--) {
              const d = new Date(); d.setMonth(d.getMonth() - i);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              aggs[key] = { name: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, visitas: 0 };
            }
            agendamentos6m.forEach(a => {
              const data = vagaToDate[a.vaga_configuracao_id];
              if (data) { const key = data.slice(0, 7); if (aggs[key]) aggs[key].visitas += 1; }
            });
            historyData.push(...Object.values(aggs));
          }
        }

        setChartData(historyData);
        setStats({
          usuariosAprovados: counts.uAprov.count || 0,
          usuariosPendentes: counts.uPend.count || 0,
          agendamentosHoje: aHoje,
          carteirinhasPendentes: counts.cPend.count || 0,
          taxaOcupacao: tOcupacao,
          agendamentosMes: totalAgendamentosMes
        });

        addLog('DASHBOARD_LOAD_SUCCESS', { statsFound: true }, 'SUCCESS');

      } catch (error) {
        addLog('DASHBOARD_LOAD_ERROR', { message: error.message }, 'ERROR');
        toast({ title: 'Atenção', description: 'Algumas métricas podem estar desatualizadas.', variant: 'warning' });
      } finally {
        setLoading(false);
      }
    });
  };

  const UsageBar = ({ label, current, max, unit, icon: Icon }) => {
    const percent = Math.min(Math.round((current / max) * 100), 100);
    const isCritical = percent >= 80;
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-gray-500 font-medium uppercase">
            <Icon className="w-3 h-3" /> {label}
          </div>
          <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-gray-700'}`}>
            {current.toFixed(1)} / {max} {unit} ({percent}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
          <div className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : 'bg-[#2D5016]'}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-[#2D5016] mb-4" /><p className="text-gray-500">Carregando painel...</p></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-slate-50 border-blue-200 shadow-sm relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-[10px] font-bold text-blue-600 uppercase">Online Agora</CardTitle>
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">{onlineUsers}</div>
            <p className="text-[9px] text-blue-500 mt-1 flex items-center gap-1 uppercase font-bold">
              <Globe className="w-2 h-2" /> Em tempo real
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.usuariosAprovados}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Perfis aprovados</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => onNavigateTab("usuarios")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Usuários Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.usuariosPendentes}</div>
            <p className="text-xs text-yellow-600 mt-1">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => onNavigateTab("carteirinhas")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Carteirinhas</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.carteirinhasPendentes}</div>
            <p className="text-xs text-blue-600 mt-1">Solicitações pendentes</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 cursor-pointer hover:border-[#2D5016] transition-colors" onClick={() => onNavigateTab("agendamentos")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Agendamentos no Mês</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.agendamentosMes}</div>
            <p className="text-xs text-emerald-600 mt-1">Aprovados</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 cursor-pointer hover:border-[#2D5016] transition-colors" onClick={() => onNavigateTab("agendamentos")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Visitas de Hoje</CardTitle>
            <Clock className="h-4 w-4 text-[#2D5016]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.agendamentosHoje}</div>
            <p className="text-xs text-gray-500 mt-1">Visitantes Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* SAÚDE DO SISTEMA */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-2 text-gray-600">
            <Activity className="w-4 h-4 text-[#2D5016]" /> SAÚDE DO SISTEMA (PLANO FREE do Banco de Dados). Caso qualquer indicador chegar a 80%, avisar IMEDIATAMENTE o Policial Eberson.
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <UsageBar label="Banco de Dados" current={limits.dbSize} max={500} unit="MB" icon={Database} />
          <UsageBar label="Storage" current={limits.storageSize} max={1024} unit="MB" icon={HardDrive} />
          <div className="space-y-2">
            <UsageBar label="Transferência Mensal" current={0} max={5120} unit="MB" icon={TrendingUp} />
            <p className="text-[9px] text-gray-400 italic">⚠ Verificar manualmente no <a href="https://supabase.com/dashboard/project/toojlckoryivrisccfiq/settings/infrastructure" target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-600">Painel do Supabase</a></p>
          </div>
        </CardContent>
      </Card>

      {/* MÉTRICAS AVANÇADAS DO SISTEMA */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conexões e MAU */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" /> CAPACIDADE DO SISTEMA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar
              label="Conexões Ativas - Se chegar em 60, A solução é aguardar."
              current={systemMetrics.connections}
              max={systemMetrics.max_connections || 60}
              unit=""
              icon={Cpu}
            />
            <UsageBar
              label="Usuários Ativos no Mês (MAU)"
              current={systemMetrics.mau}
              max={systemMetrics.mau_limit || 50000}
              unit=""
              icon={UserCheck}
            />
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-500 font-medium uppercase">
                  <Activity className="w-3 h-3" /> Cache Hit Ratio
                </div>
                <span className={`font-bold ${systemMetrics.cache_hit_ratio < 80 ? 'text-red-600' :
                  systemMetrics.cache_hit_ratio < 95 ? 'text-yellow-600' : 'text-green-600'
                  }`}>{systemMetrics.cache_hit_ratio}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                <div
                  className={`h-full transition-all duration-1000 ${systemMetrics.cache_hit_ratio < 80 ? 'bg-red-500' :
                    systemMetrics.cache_hit_ratio < 95 ? 'bg-yellow-500' : 'bg-[#2D5016]'
                    }`}
                  style={{ width: `${Math.min(systemMetrics.cache_hit_ratio, 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-gray-400">Eficiência da memória cache. Abaixo de 95% pode indicar sobrecarga.</p>
            </div>
            <div className="flex justify-between items-center text-xs border-t pt-2">
              <span className="flex items-center gap-1 text-gray-500 uppercase font-medium">
                <HardDrive className="w-3 h-3" /> Memória Cache (shared_buffers)
              </span>
              <span className="font-bold text-gray-700">{systemMetrics.shared_buffers_mb} MB</span>
            </div>
          </CardContent>
        </Card>

        {/* Tamanho por Tabela */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-gray-600">
              <Table2 className="w-4 h-4 text-blue-500" /> TAMANHO POR TABELA (TOP 8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemMetrics.table_sizes && systemMetrics.table_sizes.length > 0 ? (
              <div className="space-y-2">
                {systemMetrics.table_sizes.map((t, i) => {
                  const totalDb = limits.dbSize * 1024 * 1024;
                  const pct = totalDb > 0 ? Math.min(Math.round((t.tamanho / totalDb) * 100), 100) : 0;
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-600 font-medium truncate max-w-[60%]">{t.tabela}</span>
                        <span className="text-gray-500 font-bold">{t.tamanho_legivel} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Sem dados de tabelas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NOVO POSICIONAMENTO: CALENDÁRIO FULL WIDTH */}
      <div className="w-full">
        <CalendarioAdmin />
      </div>

      {/* GRID INFERIOR: GRÁFICO (ESQUERDA) E TAXA (DIREITA) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* OCUPAÇÃO ÚLTIMOS 6 MESES (LADO ESQUERDO) */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800 text-base">
              <CalendarDays className="w-5 h-5 mr-2 text-[#2D5016]" /> Ocupação - Últimos 6 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="visitas" stroke="#2D5016" strokeWidth={3} dot={{ r: 4, fill: '#2D5016' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">Sem dados históricos</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TAXA DE OCUPAÇÃO (LADO DIREITO) */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800 text-base">
              <TrendingUp className="w-5 h-5 mr-2 text-[#2D5016]" /> Taxa de Ocupação Atual (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <div className="text-6xl font-black text-[#2D5016] mb-4">{stats.taxaOcupacao}%</div>
            <div className="w-full max-w-sm bg-gray-100 rounded-full h-4 mb-4 border border-gray-200 overflow-hidden">
              <div
                className="bg-[#2D5016] h-4 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(stats.taxaOcupacao, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center uppercase font-bold tracking-tight px-4">
              Capacidade preenchida em relação ao total de vagas do mês vigente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;