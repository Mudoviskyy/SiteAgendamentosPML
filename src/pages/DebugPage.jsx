import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeLogs, clearLogs, addLog, LOG_LEVELS } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge'; 
import { 
  RefreshCcw, Trash2, Shield, Globe, Terminal, 
  AlertTriangle, Cpu, Activity, Zap, HardDrive, Wifi,
  AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DebugPage = () => {
  const location = useLocation();
  const { user, profile, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [lastError, setLastError] = useState(null);
  
  const [sysInfo, setSysInfo] = useState({ 
    mem: '---', 
    connection: 'Check...', 
    latency: 0,
    online: true 
  });

  useEffect(() => {
    addLog('DEBUG_UI', { status: 'mounted', layer: 'NOC_v2' }, 'INFO');
    
    const updateSystemStats = async () => {
      const start = performance.now();
      try {
        await supabase.from('perfis').select('id', { count: 'exact', head: true }).limit(1);
        const end = performance.now();
        const ping = Math.round(end - start);

        let memoryDisplay = '---';
        if (window.performance && window.performance.memory) {
          memoryDisplay = Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB';
        }

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const connType = conn ? conn.effectiveType.toUpperCase() : (navigator.onLine ? 'ONLINE' : 'OFFLINE');

        setSysInfo({
          mem: memoryDisplay,
          connection: connType,
          latency: ping,
          online: navigator.onLine
        });
      } catch (e) {
        setSysInfo(prev => ({ ...prev, online: false }));
      }
    };

    updateSystemStats();
    const interval = setInterval(updateSystemStats, 5000);

    const unsub = subscribeLogs((newLogs) => {
      setLogs(newLogs);
      // Captura o último erro para o alerta global
      const latestError = [...newLogs].reverse().find(l => l.level === 'ERROR');
      if (latestError) setLastError(latestError);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const stats = useMemo(() => ({
    errors: logs.filter(l => l.level === 'ERROR').length,
    perf: logs.filter(l => l.level === 'PERF').length,
    warn: logs.filter(l => l.level === 'WARN').length,
    total: logs.length
  }), [logs]);

  const filteredLogs = useMemo(() => 
    filter === 'ALL' ? logs : logs.filter(l => l.level === filter),
  [logs, filter]);

  // Lógica de Status do Sistema
  const getSystemStatus = () => {
    if (!sysInfo.online) return { label: 'CRITICAL_OFFLINE', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10 border-red-500/50' };
    if (sysInfo.latency > 500 || stats.errors > 5) return { label: 'DEGRADED_PERFORMANCE', color: 'text-yellow-500', icon: AlertTriangle, bg: 'bg-yellow-500/10 border-yellow-500/50' };
    return { label: 'SYSTEM_HEALTHY', color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-500/5 border-green-500/20' };
  };

  const currentStatus = getSystemStatus();

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-4 md:p-6 font-mono selection:bg-green-500 selection:text-black">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER & EMERGENCY ALERT */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/50">
                <Terminal className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
                  Painel de <span className="text-green-400">Diagnósticos</span>
                  <Badge variant="outline" className="text-[9px] border-white/20 text-slate-400">PML v2.4</Badge>
                </h1>
                <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                   <span className="flex items-center gap-1"><Cpu className="w-3 h-3"/> {sysInfo.mem}</span>
                   <span className={`flex items-center gap-1 ${sysInfo.latency > 300 ? 'text-red-400 animate-pulse' : ''}`}>
                    <Wifi className="w-3 h-3"/> {sysInfo.latency}ms
                   </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin'} className="border-white/10 hover:bg-white/10 bg-transparent h-9 px-4 text-slate-300">
                Voltar ao Admin
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="border-white/10 hover:bg-green-500/20 hover:text-green-400 bg-transparent h-9 px-4 text-slate-300">
                <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
              <Button variant="destructive" size="sm" onClick={clearLogs} className="bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 h-9 px-4">
                <Trash2 className="w-4 h-4 mr-2" /> Limpar Logs
              </Button>
            </div>
          </div>

          {/* SYSTEM HEALTH BANNER */}
          <div className={`w-full p-4 rounded-xl border flex items-center justify-between ${currentStatus.bg} transition-all duration-500`}>
             <div className="flex items-center gap-4">
                <currentStatus.icon className={`w-6 h-6 ${currentStatus.color}`} />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Status do Sistema</p>
                  <p className={`text-sm font-bold ${currentStatus.color}`}>
                    {currentStatus.label === 'SYSTEM_HEALTHY' ? 'Sistema Operacional e Saudável' : 
                     currentStatus.label === 'DEGRADED_PERFORMANCE' ? 'Performance Degradada ou Erros Recentes' : 
                     'Sistema Offline - Sem Conexão'}
                  </p>
                </div>
             </div>
             {lastError && (
               <div className="hidden md:flex items-center gap-3 bg-black/40 p-2 px-4 rounded-lg border border-white/5 max-w-md">
                 <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                 <p className="text-[11px] text-red-300 truncate font-mono">
                   Último Erro: {lastError.tag} - {JSON.stringify(lastError.data).substring(0, 40)}...
                 </p>
               </div>
             )}
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Todos os Eventos', val: stats.total, color: 'text-slate-300', filter: 'ALL' },
            { label: 'Erros e Falhas', val: stats.errors, color: 'text-red-400', filter: 'ERROR', icon: XCircle },
            { label: 'Avisos', val: stats.warn, color: 'text-yellow-400', filter: 'WARN', icon: AlertTriangle },
            { label: 'Monitoramento (Perf)', val: stats.perf, color: 'text-blue-400', filter: 'PERF', icon: Zap },
          ].map((m) => (
            <button 
              key={m.label}
              onClick={() => setFilter(m.filter)}
              className={`p-4 rounded-xl border transition-all text-left group ${
                filter === m.filter ? 'bg-white/10 border-white/30 shadow-lg' : 'bg-[#0f0f11] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200">{m.label}</p>
                {m.icon && <m.icon className={`w-4 h-4 ${m.color}`} />}
              </div>
              <p className={`text-3xl font-light mt-2 ${m.color}`}>{m.val}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* SIDEBAR: CONTEXT */}
          <div className="space-y-4 xl:col-span-1">
            <Card className="bg-[#0f0f11] border-white/10 shadow-none rounded-xl">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Rota Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-4 font-mono">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">Caminho (Path)</span>
                  <p className="bg-black/50 p-2 rounded border border-white/5 text-blue-300 break-all">{location.pathname}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">Parâmetros (Query)</span>
                  <p className="bg-black/50 p-2 rounded border border-white/5 text-slate-400 break-all">{location.search || 'Vazio'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f11] border-white/10 shadow-none rounded-xl">
              <CardHeader className="py-4 border-b border-white/5">
                <CardTitle className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" /> Autenticação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-white/5">
                   <span className="text-slate-500 text-[10px] uppercase">Usuário</span>
                   <span className="font-bold text-white">{profile?.nome?.split(' ')[0] || 'Visitante'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/30 p-3 rounded border border-white/5">
                   <span className="text-slate-500 text-[10px] uppercase">Permissão</span>
                   <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">{profile?.role || 'Público'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN EVENT STREAM */}
          <div className="xl:col-span-3">
            <Card className="bg-[#0f0f11] border-white/10 h-[65vh] flex flex-col shadow-2xl overflow-hidden relative rounded-xl">
              {/* FILTER OVERLAY BAR */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-300">Fluxo de Eventos em Tempo Real</span>
                </div>
                <span className="text-[11px] text-slate-500">Exibindo {filteredLogs.length} de {logs.length} eventos</span>
              </div>
              
              <ScrollArea className="flex-1 bg-black/20">
                <div className="font-mono p-2">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className={`border border-white/5 mb-2 rounded-lg p-3 hover:bg-white/[0.05] transition-all group ${log.level === 'ERROR' ? 'bg-red-500/10 border-red-500/30' : 'bg-[#151518]'}`}>
                      <div className="flex flex-col md:flex-row gap-4 md:items-start">
                        {/* TIMESTAMP COL */}
                        <div className="flex flex-col text-[10px] text-slate-500 w-full md:w-20 shrink-0">
                          <span className="font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                          <span className="opacity-70 text-[9px] mt-1">{log.memory?.split('M')[0] || '---'} MB</span>
                        </div>

                        {/* CONTENT COL */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LOG_LEVELS[log.level]?.color} border-current`}>
                              {log.level}
                            </span>
                            <span className="text-[11px] font-bold text-slate-200">
                              {log.tag}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate ml-auto hidden sm:block">
                              {log.pathname}
                            </span>
                          </div>
                          
                          {Object.keys(log.data).length > 0 && (
                            <div className="text-[11px] text-slate-300 bg-black/50 p-3 rounded-lg border border-white/5 overflow-x-auto scrollbar-hide">
                              {/* Pretty print das chaves do objeto para não parecer um JSON bruto, se possível */}
                              {Object.entries(log.data).map(([key, value]) => (
                                <div key={key} className="flex gap-2 mb-1 last:mb-0">
                                  <span className="text-slate-500 min-w-[80px]">{key}:</span>
                                  <span className={typeof value === 'object' ? 'text-blue-300' : 'text-slate-300'}>
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center opacity-30">
                       <Activity className="w-12 h-12 mb-3 text-slate-400" />
                       <p className="text-xs text-slate-400 font-bold">Nenhum evento registrado nesta categoria</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* STATUS FOOTER CLARO */}
              <div className="p-3 border-t border-white/10 bg-[#0a0a0c] flex justify-between items-center text-[10px] text-slate-500">
                <div className="flex gap-6">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Sistema Estável</span>
                  <span>Uso de Memória Local: {JSON.stringify(logs).length > 1024 ? Math.round(JSON.stringify(logs).length / 1024) + ' KB' : 'Normal'}</span>
                </div>
                <div className="flex items-center gap-2 text-green-400/80">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Monitorando eventos
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;