import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CalendarDays, RefreshCw, Calendar as CalendarIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input'; 
import * as XLSX from 'xlsx';
import AnalisarIPENModal from './AnalisarIPENModal';
import ImportarVisitasPDF from './ImportarVisitasPDF';

const COLORS = ['#2D5016', '#F59E0B', '#3B82F6', '#EF4444'];

const RelatoriosAdmin = () => {
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  // NOVOS ESTADOS: Controle do tipo de filtro e da data selecionada
  const [tipoFiltro, setTipoFiltro] = useState('mes'); // 'mes' ou 'dia'
  const [dataSelecionada, setDataSelecionada] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [error, setError] = useState(null);

  /** Normaliza texto: remove acentos, caixa alta, sem espaços extras */
  const norm = (str) =>
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  
  const [advMetrics, setAdvMetrics] = useState(null);
  const [ipenStats, setIpenStats] = useState(null);
  const [carteirinhasStats, setCarteirinhasStats] = useState(null);

  useEffect(() => {
    carregarMeses();
  }, []);

  const carregarMeses = async () => {
    try {
      const { data, error } = await supabase.rpc('listar_meses_com_agendamentos');
      if (error) throw error;
      
      setMesesDisponiveis(data || []);
      
      if (data && data.length > 0 && !mesSelecionado) {
        setMesSelecionado(`${data[0].ano}-${data[0].mes}`);
      }
    } catch (err) {
      console.error('Erro ao carregar meses:', err);
    }
  };

  // ALTERAÇÃO: Atualizado para reagir às mudanças do novo filtro
  useEffect(() => {
    if ((tipoFiltro === 'mes' && mesSelecionado) || (tipoFiltro === 'dia' && dataSelecionada)) {
      fetchRelatorioData();
    } else {
      // Limpa os dados se a seleção estiver vazia ao trocar de aba
      setRawData([]);
      setChartData([]);
      setPieData([]);
      setCarteirinhasStats(null);
    }
  }, [mesSelecionado, dataSelecionada, tipoFiltro]);

  const fetchRelatorioData = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          vagas_configuracao!inner(data_visita, horario, galeria, tipo_visita)
        `)
        .eq('status', 'aprovado');

      // ALTERAÇÃO: Lógica condicional da query baseada no tipoFiltro
      // ALTERAÇÃO: Lógica condicional da query baseada no tipoFiltro
      if (tipoFiltro === 'mes') {
        const [ano, mes] = mesSelecionado.split('-');
        
        // Chamada da RPC Analítica
        supabase.rpc('get_metricas_dashboard', { 
            p_ano: parseInt(ano), 
            p_mes: parseInt(mes) 
        }).then(({ data, error }) => {
            if (!error && data) setAdvMetrics(data);
            else console.error('Erro na RPC de métricas:', error);
        });

        const mesFormatado = mes.padStart(2, '0');
        const dataInicio = `${ano}-${mesFormatado}-01`;
        
        let proxMes = parseInt(mes) + 1;
        let proxAno = parseInt(ano);
        if (proxMes > 12) {
          proxMes = 1;
          proxAno++;
        }
        const dataFimLimite = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;

        query = query
          .gte('vagas_configuracao.data_visita', dataInicio)
          .lt('vagas_configuracao.data_visita', dataFimLimite);
          
        // Busca estatísticas de carteirinhas
        supabase
          .from('carteirinhas')
          .select('possui_carteirinha')
          .gte('created_at', dataInicio)
          .lt('created_at', dataFimLimite)
          .then(({ data, error }) => {
            if (!error && data) {
              const stats = { novas: 0, renovacoes: 0, ja_tenho: 0, total: data.length };
              data.forEach(c => {
                const tipo = String(c.possui_carteirinha);
                if (tipo === 'nova') stats.novas++;
                else if (tipo === 'renovacao') stats.renovacoes++;
                else stats.ja_tenho++;
              });
              setCarteirinhasStats(stats);
            } else {
              setCarteirinhasStats(null);
            }
          });

      } else if (tipoFiltro === 'dia') {
        setAdvMetrics(null);
        setCarteirinhasStats(null);
        query = query.eq('vagas_configuracao.data_visita', dataSelecionada);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const flattenedData = (data || []).map(item => ({
        ...item,
        data_visita: item.vagas_configuracao?.data_visita,
        horario: item.vagas_configuracao?.horario,
        galeria: item.vagas_configuracao?.galeria,
        tipo_visita: item.vagas_configuracao?.tipo_visita
      }));

      setRawData(flattenedData);
      processChartData(flattenedData);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Erro ao carregar os dados do relatório.');
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (data) => {
    if (!data || data.length === 0) {
      setPieData([]);
      setChartData([]);
      return;
    }

    // Dados Pizza (Mantido igual)
    const typeCount = data.reduce((acc, curr) => {
      const type = curr.tipo_visita || 'Outro';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    setPieData(Object.keys(typeCount).map(key => ({ 
      name: key.replace('_', ' ').toUpperCase(), 
      value: typeCount[key] 
    })));

    // ALTERAÇÃO: Gráfico de barras ajustado para Dia (mostra horários) ou Mês (mostra dias)
    const countMap = data.reduce((acc, curr) => {
      let key;
      if (tipoFiltro === 'dia') {
        key = curr.horario || '---';
      } else {
        key = curr.data_visita?.split('-')[2] || '01';
      }
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    setChartData(Object.keys(countMap).sort().map(key => ({ 
      label: tipoFiltro === 'dia' ? `${key}h` : key, 
      visitas: countMap[key] 
    })));
  };

  const handleExportar = () => {
    if (rawData.length === 0) return;
    setLoading(true);

    const limparTelefone = (numero) => {
      if (!numero) return "";
      return String(numero).replace(/\D/g, "");
    };

    const montarLinkWhatsapp = (numero) => {
      let limpo = limparTelefone(numero);
      if (!limpo) return "";
      if (!limpo.startsWith("55")) limpo = "55" + limpo;
      return `https://wa.me/${limpo}`;
    };
    
    // Busca prontuários do IPEN para os visitantes principais deste lote em lotes de 100 para evitar estourar o limite de URL do PostgREST
    const matriculas = [...new Set(rawData.map(item => item.matricula_preso))].filter(Boolean);
    
    const BATCH_SIZE = 100;
    const promises = [];
    for (let i = 0; i < matriculas.length; i += BATCH_SIZE) {
      const chunk = matriculas.slice(i, i + BATCH_SIZE);
      promises.push(
        supabase
          .from('vinculos_ipen')
          .select('matricula_preso, nome_visitante_normalizado, prontuario_visitante')
          .in('matricula_preso', chunk)
      );
    }
    
    Promise.all(promises)
      .then(results => {
        const error = results.find(r => r.error)?.error;
        if (error) throw error;
        
        const vinculosData = results.flatMap(r => r.data || []);
        // Mapa para busca rápida: "matricula_nomeNorm" -> prontuario
        const prontuarioMap = new Map();
        if (vinculosData) {
          vinculosData.forEach(v => {
            const key = `${v.matricula_preso}_${v.nome_visitante_normalizado}`;
            prontuarioMap.set(key, v.prontuario_visitante);
          });
        }

        const dadosFormatados = rawData.map(item => {
          const dataFormatada = item.data_visita ? item.data_visita.split('-').reverse().join('/') : "-";
          const horario = item.horario || "-";
          const telBruto = item.whatsapp || item.p_whatsapp || "";

          const formatarTipoVisita = (tipo) => {
            switch (tipo) {
              case "social_presencial": return "Social Presencial";
              case "social_video": return "Social por Vídeo";
              case "intima": return "Íntima";
              default: return tipo || "-";
            }
          };

          // Tenta pegar o prontuário oficial (IPEN 8.13)
          const nomeNorm = norm(item.visitante1_nome);
          const keyLookup = `${item.matricula_preso}_${nomeNorm}`;
          const prontuarioOficial = prontuarioMap.get(keyLookup);

          // Exibe prontuário IPEN (4-6 dígitos) ou apenas o nome — nunca usa CPF/carteirinha
          const visitanteComProntuario = prontuarioOficial
            ? `${item.visitante1_nome?.toUpperCase()} (${prontuarioOficial})`
            : `${item.visitante1_nome?.toUpperCase() || "-"}`;
          
          return {
            "DATA E HORA": `${dataFormatada} ${horario}`,
            "NOME DO INTERNO": item.nome_preso?.toUpperCase() || "-",
            "GALERIA": item.galeria || "-",
            "SALA": "", 
            "VISITANTE PRINCIPAL": visitanteComProntuario,
            "VISITANTE 2": item.visitante2_nome?.toUpperCase() || "",
            "VISITANTE 3": item.visitante3_nome?.toUpperCase() || "",
            "LINK WHATSAPP": montarLinkWhatsapp(telBruto),
            "TELEFONE": telBruto,
            "TIPO DE VISITA": formatarTipoVisita(item.tipo_visita)  
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);

        dadosFormatados.forEach((item, i) => {
          const cellAddress = XLSX.utils.encode_cell({ r: i + 1, c: 7 });
          if (item["LINK WHATSAPP"] !== "") {
            worksheet[cellAddress].l = { 
              Target: item["LINK WHATSAPP"],
              Tooltip: "Clique para abrir no WhatsApp"
            };
            worksheet[cellAddress].v = "Abrir WhatsApp"; 
          }
        });

        const wscols = [
          { wch: 20 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, 
          { wch: 45 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, 
          { wch: 15 }, { wch: 30 }
        ];
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório de Visitas");
        
        const nomeArquivo = tipoFiltro === 'mes' 
          ? `Relatorio_Mensal_${mesSelecionado}.xlsx`
          : `Relatorio_Diario_${dataSelecionada}.xlsx`;

        XLSX.writeFile(workbook, nomeArquivo);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao exportar:', err);
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col lg:flex-row gap-4 items-end">
        
        {/* ALTERAÇÃO: Nova estrutura de filtros com Select de Tipo */}
        <div className="flex flex-col gap-2 w-full lg:w-48">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
            Tipo de Filtro
          </label>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="bg-gray-50 border-gray-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="mes">Por Mês</SelectItem>
              <SelectItem value="dia">Por Dia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Renderização Condicional do Input de Filtro */}
        <div className="flex-1 w-full">
          {tipoFiltro === 'mes' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-[#2D5016]" />
                <span className="text-sm font-bold text-gray-700">Selecione o Mês</span>
              </div>
              <div className="flex gap-2">
                <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-xl">
                    {mesesDisponiveis.map((m) => (
                      <SelectItem key={`${m.ano}-${m.mes}`} value={`${m.ano}-${m.mes}`}>
                        {String(m.mes).padStart(2, '0')}/{m.ano} — ({m.total} agendamentos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={carregarMeses} title="Atualizar">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4 text-[#2D5016]" />
                <span className="text-sm font-bold text-gray-700">Selecione o Dia</span>
              </div>
              <Input 
                type="date" 
                value={dataSelecionada} 
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="bg-gray-50 border-gray-200 h-10"
              />
            </>
          )}
        </div>

        <Button 
          onClick={handleExportar} 
          disabled={loading || rawData.length === 0}
          className="bg-[#2D5016] hover:bg-[#1a320d] text-white font-bold h-10 px-6 flex gap-2 items-center shadow-md disabled:opacity-50 w-full lg:w-auto"
        >
          <Download className="w-4 h-4 text-white" />
          <span className="text-white">Exportar Excel</span>
        </Button>

        <AnalisarIPENModal 
          agendamentosDoDia={tipoFiltro === 'dia' ? rawData : []} 
          onAnaliseComplete={(stats) => tipoFiltro === 'dia' ? setIpenStats(stats) : null} 
        />

        <ImportarVisitasPDF onComplete={fetchRelatorioData} mesesDisponiveis={mesesDisponiveis} />
      </div>

      {ipenStats && tipoFiltro === 'dia' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <h4 className="text-red-800 font-bold">Resumo Faltas (IPEN)</h4>
            <p className="text-red-600 text-sm">
              Dos <strong>{rawData.length}</strong> aprovados, identificamos <strong>{ipenStats.faltasCount}</strong> ausências (Taxa de Falta: {((ipenStats.faltasCount / rawData.length) * 100).toFixed(1)}%).
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-red-300 text-red-700 bg-white" onClick={() => setIpenStats(null)}>Dispensar Análise</Button>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center bg-white rounded-xl border">
          <Loader2 className="h-8 w-8 animate-spin text-[#2D5016] mb-2" />
          <p className="text-sm text-gray-500">Buscando aprovados...</p>
        </div>
      ) : rawData.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600 uppercase">Tipo de Visita</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
              {/* ALTERAÇÃO: Título dinâmico */}
              <CardTitle className="text-sm font-bold text-gray-600 uppercase">
                {tipoFiltro === 'dia' ? 'Visitas por Horário' : 'Visitas por Dia'}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  {/* ALTERAÇÃO: Eixo X agora usa 'label' */}
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="visitas" fill="#2D5016" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {advMetrics && tipoFiltro === 'mes' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Vínculo que mais visita */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600 uppercase">Vínculos mais ativos</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advMetrics.vinculos} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status de Carteirinhas */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600 uppercase">Gargalo: Status Admin (Pendentes)</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={advMetrics.carteirinhas_kpi} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                         {advMetrics.carteirinhas_kpi.map((_, i) => <Cell key={i} fill={COLORS[(i+1) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Ocupação Galerias */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600 uppercase">Ocupação vs Capacidade</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advMetrics.ocupacao_galerias}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Legend verticalAlign="top" iconType="circle" />
                      <Bar dataKey="capacidade" name="Vagas Totais" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={15} />
                      <Bar dataKey="utilizados" name="Agendados" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Frequência Visitas por preso */}
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600 uppercase">Frequência Mensal por Interno</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={advMetrics.distribuicao_presos}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="category" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="quantity" name="Nº de Detentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={35} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Volumetria de Novas Carteirinhas */}
              <Card className="shadow-sm border-gray-200 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-600 uppercase">Cadastros (Carteirinhas)</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4 pt-0">
                  {carteirinhasStats && (
                    <div className="flex flex-wrap gap-4 mb-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex flex-col"><span className="text-xs text-slate-500 uppercase font-bold">1ª Via (Novas)</span><span className="font-bold text-slate-800">{carteirinhasStats.novas}</span></div>
                      <div className="flex flex-col"><span className="text-xs text-slate-500 uppercase font-bold">Renovações</span><span className="font-bold text-slate-800">{carteirinhasStats.renovacoes}</span></div>
                      <div className="flex flex-col"><span className="text-xs text-slate-500 uppercase font-bold">Migrações</span><span className="font-bold text-slate-800">{carteirinhasStats.ja_tenho}</span></div>
                      <div className="flex flex-col ml-auto border-l pl-4"><span className="text-xs text-slate-500 uppercase font-bold">Total</span><span className="font-bold text-indigo-600">{carteirinhasStats.total}</span></div>
                    </div>
                  )}
                  <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={advMetrics.volumetria_mensal}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Area type="monotone" dataKey="carteirinhas" name="Inscrições Diárias" stroke="#6366f1" fillOpacity={0.2} fill="#6366f1" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Taxa de Faltas (IPEN) */}
            <div className="mt-6">
              <Card className="shadow-sm border-gray-200 bg-red-50/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-red-700 uppercase flex items-center gap-2">
                     Faltas (No-Show) por Vínculo
                  </CardTitle>
                  <CardDescription className="text-xs">Cálculo de evasões baseado no cruzamento diário entre base real e pdfs do IPEN processados no mês.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  {advMetrics.faltas_ipen && advMetrics.faltas_ipen.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={advMetrics.faltas_ipen}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Legend verticalAlign="top" iconType="circle" />
                        <Bar dataKey="agendados" name="Comparações Totais" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="faltas" name="Faltas Confirmadas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex w-full h-full items-center justify-center text-sm font-medium text-red-400">
                       Importe os PDFs de Relação de Parentesco e de Visitas Realizadas para gerar a taxa de abstenção.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            
            {/* Listas Acionáveis */}
            <div className="mt-6 mb-2">
              <span className="text-[11px] text-slate-500 font-medium">* Nota: Para manter a precisão destas listas de alerta, certifique-se de sincronizar o Relatório 8.6 do IPEN mensalmente.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h4 className="text-sm font-bold text-red-700 uppercase border-b pb-2 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} /> Top 6: Visitantes Inadimplentes
                </h4>
                <div className="space-y-2">
                  {advMetrics.visitantes_inadimplentes?.length > 0 ? advMetrics.visitantes_inadimplentes.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded-lg border border-red-100">
                      <span className="font-medium text-red-900">{i+1}. {p.name}</span>
                      <span className="font-bold text-red-700 bg-red-200 px-2 py-1 rounded-md">{p.value} faltas</span>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-400 p-4 text-center">Nenhum visitante com múltiplas faltas no mês.</div>
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h4 className="text-sm font-bold text-amber-700 uppercase border-b pb-2 mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} /> Alerta: Visitantes Cruzados
                </h4>
                <div className="space-y-2">
                  {advMetrics.visitantes_cruzados?.length > 0 ? advMetrics.visitantes_cruzados.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-amber-50 p-2 rounded-lg border border-amber-100">
                      <span className="font-medium text-amber-900">{i+1}. {v.name}</span>
                      <span className="font-bold text-amber-700 bg-amber-200 px-2 py-1 rounded-md">{v.value} internos</span>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-400 p-4 text-center">Nenhum visitante visitou múltiplos internos no mês.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      ) : (
        <Card className="bg-gray-50 border-dashed border-2 py-16">
          <CardContent className="flex flex-col items-center justify-center text-gray-400">
            <CalendarDays className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">Nenhum agendamento aprovado para este período.</p>
            <p className="text-xs">Certifique-se de que existem registros com status "aprovado".</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelatoriosAdmin;