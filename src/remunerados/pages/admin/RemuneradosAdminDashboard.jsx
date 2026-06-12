import React, { useEffect, useState, useMemo } from 'react';
import { formatarHorasMinutos } from '@/lib/utils';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, CheckCircle, Percent, Calendar as CalendarIcon, Settings, CalendarDays, ClipboardCheck, Search, Save, Loader2, UserCog, Download, ToggleLeft, ToggleRight, Clock, AlertCircle, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRemuneradosAdmin } from '../../hooks/useRemuneradosAdmin';
import MetricsCard from '../../components/MetricsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import ListaSolicitacoesAdmin from '../../components/ListaSolicitacoesAdmin';
import CalendarioRemunerados from '../../components/CalendarioRemunerados';

const PLANTAO_OPTIONS = [
  { value: 'A', label: 'Plantão A' },
  { value: 'B', label: 'Plantão B' },
  { value: 'C', label: 'Plantão C' },
  { value: 'D', label: 'Plantão D' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Outras Unidades', label: 'Outras Unidades' },
];

const RemuneradosAdminDashboard = () => {
  const { fetchDashboardMetrics, fetchServidores, updateServidor, fetchRelatorioData, loading } = useRemuneradosAdmin();
  const [metrics, setMetrics] = useState(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const navigate = useNavigate();

  // Servidores state
  const [servidores, setServidores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [plantaoFilter, setPlantaoFilter] = useState('todos');
  const [editingId, setEditingId] = useState(null);
  const [newPlantao, setNewPlantao] = useState('');
  const [servidoresLoaded, setServidoresLoaded] = useState(false);

  // Productivity state (Servidores/RD)
  const [subTab, setSubTab] = useState('lista');
  const [prodMonth, setProdMonth] = useState(new Date().getMonth() + 1);
  const [prodYear, setProdYear] = useState(new Date().getFullYear());
  const [productivityData, setProductivityData] = useState([]);
  const [prodLoading, setProdLoading] = useState(false);

  // Calculator state
  const [calcVagasTotal, setCalcVagasTotal] = useState('');
  const [calcDescontoRN, setCalcDescontoRN] = useState('');

  const chartData = [
    {
      name: 'Plantões',
      RD: metrics?.chart?.RD || 0,
      RN: metrics?.chart?.RN || 0,
    }
  ];

  const pieColors = ['#2D5016', '#1e3a8a', '#f59e0b', '#8b5cf6', '#10b981', '#64748b'];
  const plantaoChartData = useMemo(() => {
    if (!metrics?.plantaoDistribution) return [];
    return Object.entries(metrics.plantaoDistribution).map(([name, value]) => ({ name, value }));
  }, [metrics]);

  useEffect(() => {
    const loadData = async () => {
      const mes = currentCalendarDate.getMonth() + 1;
      const ano = currentCalendarDate.getFullYear();
      const res = await fetchDashboardMetrics(mes, ano);
      if (res.success) setMetrics(res.data);
    };
    loadData();
  }, [fetchDashboardMetrics, currentCalendarDate]);

  const loadServidores = async () => {
    const res = await fetchServidores();
    if (res.success) setServidores(res.data);
    setServidoresLoaded(true);
  };

  const loadProductivity = async () => {
    setProdLoading(true);
    const res = await fetchRelatorioData(prodYear, prodMonth);
    if (res.success) {
      const counts = {};
      res.data.forEach(item => {
        const sId = item.servidor_id;
        if (!counts[sId]) {
          counts[sId] = {
            id: sId,
            nome: item.servidores?.nome || 'N/A',
            matricula: item.servidores?.matricula || 'N/A',
            plantao: item.servidores?.plantao || 'N/A',
            RD: 0,
            RN: 0,
            total: 0
          };
        }
        if (item.tipo === 'RD') counts[sId].RD++;
        else if (item.tipo === 'RN') counts[sId].RN++;
        counts[sId].total++;
      });
      setProductivityData(Object.values(counts).sort((a, b) => b.total - a.total));
    }
    setProdLoading(false);
  };

  useEffect(() => {
    if (subTab === 'servidores_rd') {
      loadProductivity();
    }
  }, [subTab, prodMonth, prodYear]);

  const handleTabChange = (value) => {
    if (value === 'servidores' && !servidoresLoaded) {
      loadServidores();
    }
  };

  const filteredProdData = useMemo(() => {
    return productivityData.filter(s => {
      const matchSearch = s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || s.matricula?.includes(searchTerm);
      const matchPlantao = plantaoFilter === 'todos' || s.plantao === plantaoFilter;
      return matchSearch && matchPlantao;
    });
  }, [productivityData, searchTerm, plantaoFilter]);

  const filteredServidores = useMemo(() => {
    return servidores.filter(s => {
      const matchSearch = s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || s.matricula?.includes(searchTerm);
      const matchPlantao = plantaoFilter === 'todos' || s.plantao === plantaoFilter || (plantaoFilter === 'Sem Plantão' && !s.plantao);
      return matchSearch && matchPlantao;
    });
  }, [servidores, searchTerm, plantaoFilter]);

  const exportToCSV = () => {
    const headers = ['Nome', 'Matrícula', 'Plantão', 'Saldo de Horas', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredServidores.map(s => {
        const plantao = s.plantao || 'Não definido';
        // Handle array or object from Supabase relation
        let saldo = 0;
        if (Array.isArray(s.banco_horas)) saldo = s.banco_horas[0]?.saldo || 0;
        else if (s.banco_horas) saldo = s.banco_horas.saldo || 0;
        
        const status = s.ativo ? 'Ativo' : 'Inativo';
        return `"${s.nome}","${s.matricula}","${plantao}","${saldo}","${status}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `servidores_remunerados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleToggleAtivo = async (servidor) => {
    const res = await updateServidor(servidor.id, { ativo: !servidor.ativo });
    if (res.success) {
      loadServidores();
    }
  };

  const handleStartEdit = (servidor) => {
    setEditingId(servidor.id);
    setNewPlantao(servidor.plantao || '');
  };

  const handleSave = async (id) => {
    const res = await updateServidor(id, { plantao: newPlantao });
    if (res.success) {
      setEditingId(null);
      loadServidores();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 pb-8">
      <Helmet><title>Dashboard Admin - Remunerados</title></Helmet>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Visão Geral de Escalas</h1>
        <p className="text-gray-500">Acompanhe as métricas e gerencie os plantões remunerados.</p>
      </div>

      {/* Seção de Métricas Principais */}
      {loading && !metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricsCard title="Taxa de Ocupação" value={`${metrics?.occupancyRate || 0}%`} icon={Percent} colorClass="#3b82f6" />
          <MetricsCard title="Total de Vagas" value={metrics?.totalVagas || 0} icon={CalendarIcon} colorClass="#2D5016" />
          <MetricsCard title="Vagas Preenchidas" value={metrics?.completedServices || 0} icon={CheckCircle} colorClass="#10b981" />
          <MetricsCard 
            title="Ações Pendentes" 
            value={metrics?.pendingRequests || 0} 
            icon={metrics?.pendingRequests > 0 ? AlertCircle : CheckCircle} 
            colorClass={metrics?.pendingRequests > 0 ? "#ef4444" : "#10b981"} 
          />
          <MetricsCard title="Servidores Ativos" value={metrics?.activeStaff || 0} icon={Users} colorClass="#8b5cf6" />
        </div>
      )}

      <Tabs defaultValue="geral" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="mb-6 bg-white border shadow-sm h-12 p-1">
          <TabsTrigger value="geral" className="text-sm data-[state=active]:bg-[#2D5016] data-[state=active]:text-white rounded-md px-6">Métricas & Calendário</TabsTrigger>
          <TabsTrigger value="horas" className="text-sm data-[state=active]:bg-[#2D5016] data-[state=active]:text-white rounded-md px-6">Banco de Horas</TabsTrigger>
          <TabsTrigger value="servidores" className="text-sm data-[state=active]:bg-[#2D5016] data-[state=active]:text-white rounded-md px-6">
            <UserCog className="w-4 h-4 mr-1.5" /> Gerenciar Servidores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-8 mt-0">
          {/* CALENDÁRIO + DIREITA (GRÁFICO + AÇÕES) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* ESQUERDA: CALENDÁRIO (OCUPA 2/3) */}
            <div className="xl:col-span-2">
              <CalendarioRemunerados onMonthChange={setCurrentCalendarDate} />
            </div>

            {/* DIREITA (GRÁFICO E AÇÕES EMPILHADOS) */}
            <div className="space-y-6">

              {/* GRÁFICO DE COMPARATIVO */}
              <Card className="shadow-sm border border-gray-100">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg text-gray-700">
                    Comparativo RD vs RN (Neste Mês)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend verticalAlign="top" height={36}/>
                        <Bar dataKey="RD" fill="#2D5016" radius={[4, 4, 0, 0]} name="Diurno (RD)" />
                        <Bar dataKey="RN" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Noturno (RN)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AÇÕES RÁPIDAS (ORGANIZAÇÃO HORIZONTAL EM GRID) */}
              <Card className="shadow-sm border border-gray-100">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                  <CardTitle className="text-lg text-gray-700">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button onClick={() => navigate('/remunerados/admin/vagas')} variant="outline" className="h-12 text-xs flex flex-col gap-0.5 items-center justify-center border-gray-200 hover:border-[#2D5016] hover:text-[#2D5016]">
                      <Settings className="w-4 h-4" />
                      Vagas
                    </Button>

                    <Button onClick={() => navigate('/remunerados/admin/schedule')} variant="outline" className="h-12 text-xs flex flex-col gap-0.5 items-center justify-center border-gray-200 hover:border-blue-600 hover:text-blue-600">
                      <CalendarDays className="w-4 h-4" />
                      Agenda
                    </Button>

                    <Button onClick={() => navigate('/remunerados/admin/approvals')} variant="outline" className="relative h-12 text-xs flex flex-col gap-0.5 items-center justify-center border-gray-200 hover:border-amber-500 hover:text-amber-500">
                      <ClipboardCheck className="w-4 h-4" />
                      Aprovar
                      {metrics?.pendingRequests > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-sm">
                          {metrics.pendingRequests}
                        </span>
                      )}
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-12 text-xs flex flex-col gap-0.5 items-center justify-center border-gray-200 hover:border-emerald-600 hover:text-emerald-600">
                          <Calculator className="w-4 h-4" />
                          Calculadora
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-emerald-600" />
                            Calculadora de Vagas RD
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="vagas-total">Total de vagas do mês</Label>
                            <Input 
                              id="vagas-total" 
                              type="number" 
                              placeholder="Ex: 129" 
                              value={calcVagasTotal} 
                              onChange={(e) => setCalcVagasTotal(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="desconto-rn">Vagas para descontar (RN)</Label>
                            <Input 
                              id="desconto-rn" 
                              type="number" 
                              placeholder="Ex: 33" 
                              value={calcDescontoRN} 
                              onChange={(e) => setCalcDescontoRN(e.target.value)}
                            />
                          </div>
                          
                          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-emerald-700 font-medium">Sobra para RDs</p>
                              <p className="text-xs text-emerald-600 opacity-80">Vagas disponíveis para plantão diurno</p>
                            </div>
                            <div className="text-3xl font-bold text-emerald-800">
                              {Math.max(0, (Number(calcVagasTotal) || 0) - (Number(calcDescontoRN) || 0))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setCalcVagasTotal(''); setCalcDescontoRN(''); }}>Limpar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* GRÁFICO DE DISTRIBUIÇÃO */}
              <Card className="shadow-sm border border-gray-100">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3">
                  <CardTitle className="text-sm font-medium text-gray-700">Distribuição de Plantões (Ativos)</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-2">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={plantaoChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {plantaoChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="horas" className="mt-0">
          <Card className="shadow-sm border border-gray-100 overflow-hidden">
            <ListaSolicitacoesAdmin />
          </Card>
        </TabsContent>

        <TabsContent value="servidores" className="mt-0">
          <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
            <Card className="shadow-sm border border-gray-100 overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                  <TabsList className="bg-white border shadow-sm h-10 p-1">
                    <TabsTrigger value="lista" className="text-xs data-[state=active]:bg-[#2D5016] data-[state=active]:text-white">Lista de Servidores</TabsTrigger>
                    <TabsTrigger value="servidores_rd" className="text-xs data-[state=active]:bg-[#2D5016] data-[state=active]:text-white">Servidores/RD</TabsTrigger>
                  </TabsList>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto pb-4 md:pb-0">
                    {subTab === 'servidores_rd' && (
                      <div className="flex gap-2 mr-2">
                        <Select value={String(prodMonth)} onValueChange={v => setProdMonth(Number(v))}>
                          <SelectTrigger className="w-[110px] h-9 bg-white">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={String(prodYear)} onValueChange={v => setProdYear(Number(v))}>
                          <SelectTrigger className="w-[90px] h-9 bg-white">
                            <SelectValue placeholder="Ano" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026].map(y => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Buscar por nome ou matrícula..." 
                        className="pl-9 h-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select value={plantaoFilter} onValueChange={setPlantaoFilter}>
                      <SelectTrigger className="w-full sm:w-[140px] h-9 bg-white">
                        <SelectValue placeholder="Plantão" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos Plantões</SelectItem>
                        {PLANTAO_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                        <SelectItem value="Sem Plantão">Sem Plantão</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      onClick={subTab === 'lista' ? exportToCSV : () => {
                        const headers = ['Nome', 'Matrícula', 'RD', 'RN', 'Total'];
                        const csvContent = [
                          headers.join(','),
                          ...filteredProdData.map(s => `"${s.nome}","${s.matricula}",${s.RD},${s.RN},${s.total}`)
                        ].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `produtividade_servidores_${prodMonth}_${prodYear}.csv`;
                        link.click();
                      }} 
                      variant="outline" 
                      className="h-9 px-3 bg-white hover:bg-gray-50 text-gray-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <TabsContent value="lista" className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[30%]">Nome</TableHead>
                          <TableHead className="w-[15%]">Matrícula</TableHead>
                          <TableHead className="w-[20%]">Tipo de Plantão</TableHead>
                          <TableHead className="w-[15%] text-center">Saldo Horas</TableHead>
                          <TableHead className="w-[20%] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading && servidores.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2D5016] opacity-20" />
                            </TableCell>
                          </TableRow>
                        ) : filteredServidores.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                              Nenhum servidor encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredServidores.map((s) => {
                            let saldo = 0;
                            if (Array.isArray(s.banco_horas)) saldo = s.banco_horas[0]?.saldo || 0;
                            else if (s.banco_horas) saldo = s.banco_horas.saldo || 0;
                            
                            return (
                              <TableRow key={s.id} className={`hover:bg-gray-50/50 transition-colors ${!s.ativo ? 'opacity-50 bg-gray-50' : ''}`}>
                                <TableCell className="font-medium text-gray-900 flex items-center gap-2">
                                  {s.nome}
                                  {!s.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                                </TableCell>
                                <TableCell className="text-gray-600 font-mono text-sm">{s.matricula}</TableCell>
                                <TableCell>
                                  {editingId === s.id ? (
                                    <Select value={newPlantao} onValueChange={setNewPlantao}>
                                      <SelectTrigger className="h-9 w-full bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PLANTAO_OPTIONS.map(opt => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {s.plantao ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                          {PLANTAO_OPTIONS.find(opt => opt.value === s.plantao)?.label || s.plantao}
                                        </Badge>
                                      ) : (
                                        <span className="text-sm text-gray-400 italic">Não definido</span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`font-mono text-xs px-2 py-0.5 ${saldo > 0 ? 'bg-green-50 text-green-700 border-green-200' : saldo < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600'}`}>
                                    <Clock className="w-3 h-3 mr-1 inline" />
                                    {saldo > 0 ? '+' : ''}{formatarHorasMinutos(saldo)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === s.id ? (
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingId(null)} disabled={loading}>
                                        Cancelar
                                      </Button>
                                      <Button size="sm" className="h-8 bg-[#2D5016] hover:bg-[#1a330e]" onClick={() => handleSave(s.id)} disabled={loading}>
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                        Salvar
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        title={s.ativo ? "Desativar Servidor" : "Ativar Servidor"}
                                        className={`h-8 w-8 p-0 ${s.ativo ? 'text-gray-400 hover:text-red-600' : 'text-red-500 hover:text-green-600'}`} 
                                        onClick={() => handleToggleAtivo(s)}
                                      >
                                        {s.ativo ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 text-[#2D5016] hover:bg-emerald-50" onClick={() => handleStartEdit(s)}>
                                        Editar
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="servidores_rd" className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[30%]">Nome</TableHead>
                          <TableHead className="w-[15%]">Matrícula</TableHead>
                          <TableHead className="w-[15%]">Plantão Base</TableHead>
                          <TableHead className="w-[10%] text-center">RD (Dia)</TableHead>
                          <TableHead className="w-[10%] text-center">RN (Noite)</TableHead>
                          <TableHead className="w-[10%] text-center font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prodLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2D5016] opacity-20" />
                            </TableCell>
                          </TableRow>
                        ) : filteredProdData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                              Nenhum registro de plantão para este período.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProdData.map((s) => (
                            <TableRow key={s.id} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium text-gray-900">{s.nome}</TableCell>
                              <TableCell className="text-gray-600 font-mono text-sm">{s.matricula}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {PLANTAO_OPTIONS.find(opt => opt.value === s.plantao)?.label || s.plantao}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-semibold ${s.RD > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{s.RD}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-semibold ${s.RN > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{s.RN}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={`bg-[#2D5016] text-white font-bold px-3 ${s.total > 10 ? 'animate-pulse ring-2 ring-[#2D5016]/20' : ''}`}>
                                  {s.total}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RemuneradosAdminDashboard;