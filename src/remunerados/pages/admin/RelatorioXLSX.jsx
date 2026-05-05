import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { FileSpreadsheet, Download, Loader2, Eye, Calendar, Upload } from 'lucide-react';
import { remuneradosAdminService } from '../../services/remuneradosAdminService';
import * as XLSX from 'xlsx';
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';
import { saveAs } from 'file-saver';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PLANTAO_ORDER = ['A', 'B', 'C', 'D', 'Administrativo', 'Outras Unidades'];

const PLANTAO_COLORS_UI = {
  'A': 'bg-blue-100 text-blue-700 border-blue-200',
  'B': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'C': 'bg-amber-100 text-amber-700 border-amber-200',
  'D': 'bg-purple-100 text-purple-700 border-purple-200',
  'Administrativo': 'bg-slate-100 text-slate-700 border-slate-200',
  'Outras Unidades': 'bg-rose-100 text-rose-700 border-rose-200',
};

const PLANTAO_DOTS = {
  'A': 'bg-blue-500',
  'B': 'bg-emerald-500',
  'C': 'bg-amber-500',
  'D': 'bg-purple-500',
  'Administrativo': 'bg-slate-500',
  'Outras Unidades': 'bg-rose-500',
};

const RelatorioXLSX = () => {
  const currentDate = new Date();
  const [mes, setMes] = useState(String(currentDate.getMonth() + 1));
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const { toast } = useToast();

  // Estados para sincronização
  const [syncFile, setSyncFile] = useState(null);
  const [syncWorkbook, setSyncWorkbook] = useState(null);
  const [syncSheets, setSyncSheets] = useState([]);
  const [selectedSyncSheet, setSelectedSyncSheet] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const fileInputRef = React.useRef(null);

  const anos = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Organizar dados por plantão
  const dadosOrganizados = useMemo(() => {
    if (!dadosRelatorio) return null;

    // Agrupar por servidor
    const servidorMap = {};
    dadosRelatorio.forEach(ag => {
      const serv = ag.servidores; // O Supabase costuma manter o alias se especificado no select ou o nome da tabela
      if (!serv) return;
      const key = serv.id;
      if (!servidorMap[key]) {
        servidorMap[key] = {
          id: serv.id,
          nome: serv.nome,
          matricula: serv.matricula,
          plantao: serv.plantao || 'Outras Unidades',
          dias: {},
          totalShifts: 0
        };
      }
      const dia = new Date(ag.data + 'T12:00:00Z').getDate();
      const current = servidorMap[key].dias[dia];
      if (current) {
        if (current === 'RD' && ag.tipo === 'RD') {
          servidorMap[key].dias[dia] = 'RD Duplo';
        } else if (current === 'RN' && ag.tipo === 'RN') {
          servidorMap[key].dias[dia] = 'RN Duplo';
        } else if (current === 'RD Duplo' && ag.tipo === 'RD') {
          servidorMap[key].dias[dia] = 'RD Triplo';
        } else {
          servidorMap[key].dias[dia] = current + '/' + ag.tipo;
        }
      } else {
        servidorMap[key].dias[dia] = ag.tipo;
      }
      servidorMap[key].totalShifts++;
    });

    // Organizar por bloco de plantão
    const blocos = {};
    PLANTAO_ORDER.forEach(p => { blocos[p] = []; });

    Object.values(servidorMap).forEach(serv => {
      const plantao = PLANTAO_ORDER.includes(serv.plantao) ? serv.plantao : 'Outras Unidades';
      blocos[plantao].push(serv);
    });

    // Ordenar nomes dentro de cada bloco
    PLANTAO_ORDER.forEach(p => {
      blocos[p].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });

    return blocos;
  }, [dadosRelatorio]);

  const handleBuscar = async () => {
    setLoading(true);
    try {
      const res = await remuneradosAdminService.fetchRelatorioData(parseInt(ano), parseInt(mes));
      if (!res.success) throw new Error(res.error);

      setDadosRelatorio(res.data);
      setDaysInMonth(res.daysInMonth);

      if (res.data.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: `Não há agendamentos aprovados para ${MESES[parseInt(mes) - 1]}/${ano}.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Dados carregados",
          description: `${res.data.length} registro(s) encontrado(s).`,
          className: "bg-[#2D5016] text-white"
        });
      }
    } catch (err) {
      console.error("Erro ao buscar relatório:", err);
      toast({
        title: "Erro",
        description: err.message || "Falha ao buscar dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados automaticamente ao mudar mês ou ano
  React.useEffect(() => {
    handleBuscar();
  }, [mes, ano]);

  const handleExportXLSX = () => {
    if (!dadosOrganizados || !daysInMonth) return;

    const wb = XLSX.utils.book_new();
    const rows = [];

    // Header row
    const headerRow = ['Nº', 'NOME', 'PLANTÃO'];
    for (let d = 1; d <= daysInMonth; d++) {
      headerRow.push(String(d));
    }
    headerRow.push('TOTAL');
    rows.push(headerRow);

    let numero = 1;

    PLANTAO_ORDER.forEach(plantao => {
      const servidores = dadosOrganizados[plantao];
      if (servidores.length === 0) return;

      // Linha de título do bloco
      const tituloRow = new Array(3 + daysInMonth).fill('');
      const label = plantao === 'Outras Unidades' 
        ? 'OUTRAS UNIDADES' 
        : plantao === 'Administrativo' 
          ? 'ADMINISTRATIVO' 
          : `PLANTÃO ${plantao}`;
      tituloRow[1] = label;
      rows.push(tituloRow);

      // Linhas de servidores
      servidores.forEach(serv => {
        const row = [numero, serv.nome, serv.plantao];
        for (let d = 1; d <= daysInMonth; d++) {
          const shift = serv.dias[d] || '';
          row.push(shift);
        }
        row.push(serv.totalShifts);
        rows.push(row);
        numero++;
      });

      // Linha vazia separadora entre blocos
      rows.push(new Array(3 + daysInMonth).fill(''));
    });

    // Linha de Resumo Final
    rows.push([]);
    rows.push(['', 'RESUMO DO MÊS', '']);
    rows.push(['', 'Total de Servidores no Relatório:', totalServidores]);
    rows.push(['', 'Total de Plantões (RD/RN) Aprovados:', dadosRelatorio.length]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Ajustar larguras de coluna
    const colWidths = [
      { wch: 5 },  // Nº
      { wch: 32 }, // Nome
      { wch: 18 }, // Plantão
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      colWidths.push({ wch: 5 }); // Dias
    }
    colWidths.push({ wch: 8 }); // Total
    ws['!cols'] = colWidths;

    // Aplicar estilos nas linhas de cabeçalho de bloco (negrito)
    // Nota: xlsx community edition não suporta estilos avançados,
    // mas a estrutura está correta para visualização

    const mesNome = MESES[parseInt(mes) - 1];
    XLSX.utils.book_append_sheet(wb, ws, `${mesNome} ${ano}`);

    const fileName = `Relatorio_Remunerados_${mesNome}_${ano}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Relatório exportado!",
      description: `Arquivo "${fileName}" gerado com sucesso.`,
      className: "bg-[#2D5016] text-white"
    });
  };

  // Contagem total de servidores para exibição
  const totalServidores = useMemo(() => {
    if (!dadosOrganizados) return 0;
    return PLANTAO_ORDER.reduce((acc, p) => acc + dadosOrganizados[p].length, 0);
  }, [dadosOrganizados]);

  // Handler de upload e sincronização
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSyncFile(file);
    try {
      const workbook = await XlsxPopulate.fromDataAsync(file);
      setSyncWorkbook(workbook);
      
      const sheets = workbook.sheets().map(ws => ws.name());
      setSyncSheets(sheets);
      if (sheets.length > 0) {
        setSelectedSyncSheet(sheets[0]);
      }
      setSyncModalOpen(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao ler arquivo",
        description: "O arquivo selecionado não é uma planilha válida ou está protegido.",
        variant: "destructive"
      });
    }
    e.target.value = null; // reset
  };

  const handleSyncConfirm = async () => {
    if (!syncWorkbook || !selectedSyncSheet || !dadosRelatorio) return;

    try {
      const wb = syncWorkbook;
      const ws = wb.sheet(selectedSyncSheet);
      if (!ws) throw new Error("Aba não encontrada na planilha.");

      const normalizeStr = (s) => s ? s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

      // Lookup Map
      const serverShifts = {};
      dadosRelatorio.forEach(ag => {
         const nome = normalizeStr(ag.servidores?.nome);
         if (!nome) return;
         if (!serverShifts[nome]) serverShifts[nome] = {};
         
         const dia = new Date(ag.data + 'T12:00:00Z').getDate();
         const tipo = ag.tipo;
         
         const current = serverShifts[nome][dia];
         if (current) {
            if (current === 'RD' && tipo === 'RD') {
              serverShifts[nome][dia] = 'RD Duplo';
            } else if (current === 'RN' && tipo === 'RN') {
              serverShifts[nome][dia] = 'RN Duplo';
            } else if (current === 'RD Duplo' && tipo === 'RD') {
              serverShifts[nome][dia] = 'RD Triplo';
            } else {
              serverShifts[nome][dia] = current + '/' + tipo;
            }
         } else {
            serverShifts[nome][dia] = tipo;
         }
      });

      let namesFound = 0;
      let shiftsWritten = 0;

      // Nomes estão na coluna C (índice 3). Dias 1-31 nas colunas E(5) até AI(35).
      const usedRange = ws.usedRange();
      const endRow = usedRange ? usedRange.endCell().rowNumber() : 500;

      console.log("=== INÍCIO DA SINCRONIZAÇÃO ===");

      // Linhas reservadas para legenda – NUNCA acessadas pelo código.
      // Acesso a células mescladas nessa área corromperia o arquivo.
      const LEGEND_ROW_START = 125;
      const LEGEND_ROW_END   = 137;

      // Mapa de cores estático por sigla de turno (ARGB sem #)
      const SHIFT_COLORS = {
        'RD':     { fill: 'FF000000', fontColor: 'FFFFFFFF', fontSize: 10, fontFamily: 'Arial Black' },
        'RN':     { fill: 'FF000000', fontColor: 'FFFFFFFF', fontSize: 10, fontFamily: 'Arial Black' },
        '2RDS':   { fill: 'FF000000', fontColor: 'FFFFFFFF', fontSize: 8,  fontFamily: 'Arial Black' },
      };

      // Mapeia o nome interno do turno para a sigla da legenda
      const getLegendKey = (shiftVal) => {
        if (!shiftVal) return null;
        if (shiftVal === 'RD Duplo') return '2RDS';
        if (shiftVal === 'RD' || shiftVal === 'RN') return shiftVal.toUpperCase();
        return null; // Ignora outros tipos para manter o padrão solicitado
      };

      // Aplica estilo estático a uma célula de dados
      const applyShiftStyle = (cell, key) => {
        const s = SHIFT_COLORS[key];
        if (!s) return;
        try { cell.style('fill', { type: 'solid', color: { rgb: s.fill } }); } catch(e) {}
        try { cell.style('fontColor', { rgb: s.fontColor }); } catch(e) {}
        try { cell.style('fontSize', s.fontSize); } catch(e) {}
        try { cell.style('fontFamily', s.fontFamily); } catch(e) {}
        try { cell.style('bold', true); } catch(e) {}
        try { cell.style('horizontalAlignment', 'center'); } catch(e) {}
        try { cell.style('verticalAlignment', 'center'); } catch(e) {}
      };

      for (let r = 1; r <= endRow; r++) {
        // Pula as linhas da legenda — não tocar essas células de forma alguma
        if (r >= LEGEND_ROW_START && r <= LEGEND_ROW_END) continue;

        const nameCell = ws.cell(r, 3); // Coluna C = nome do servidor
        let rawVal = nameCell.value();
        if (!rawVal) continue;

        if (typeof rawVal === 'object') {
          if (rawVal.richText) rawVal = rawVal.richText.map(x => x.text).join('');
          else if (rawVal.result !== undefined) rawVal = rawVal.result;
          else if (rawVal.error) continue;
          else rawVal = '';
        }

        if (!rawVal) continue;
        const sheetNameVal = normalizeStr(rawVal);
        if (sheetNameVal.length < 3) continue;

        const shifts = serverShifts[sheetNameVal];
        if (shifts) {
          namesFound++;
          console.log(`-> ENCONTRADO linha ${r}: "${sheetNameVal}"`);
          for (let d = 1; d <= 31; d++) {
            if (shifts[d]) {
              const cell = ws.cell(r, d + 4); // Dia d → coluna E(5) + (d-1)
              const legendKey = getLegendKey(shifts[d]);
              cell.value(legendKey);
              applyShiftStyle(cell, legendKey);
              shiftsWritten++;
            }
          }
        }
      }
      console.log(`=== FIM: ${namesFound} servidores, ${shiftsWritten} plantões ===`);

      const mesNome = MESES[parseInt(mes) - 1];
      const fileName = `ESCALA_SINCRONIZADA_${mesNome}_${ano}.xlsx`;
      
      const buffer = await wb.outputAsync();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      toast({
        title: "Sincronização concluída!",
        description: `Planilha gerada. ${shiftsWritten} plantões em ${namesFound} servidores.`,
        className: namesFound > 0 ? "bg-[#2D5016] text-white" : "bg-yellow-500 text-white"
      });

      setSyncModalOpen(false);
      setSyncWorkbook(null);
      setSyncFile(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro na sincronização",
        description: err.message || "Falha ao processar a planilha.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 pb-8">
      <Helmet><title>Relatório XLSX - Remunerados Admin</title></Helmet>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-[#2D5016]" />
          Relatório de Escalas
        </h1>
        <p className="text-gray-500 mt-1">Gere relatórios em Excel com os dados de plantões aprovados por mês.</p>
      </div>

      {/* SELETORES */}
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[160px]">
              <Label className="text-sm font-semibold text-gray-600">Mês</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[120px]">
              <Label className="text-sm font-semibold text-gray-600">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(a => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end h-10">
              {loading && (
                <div className="flex items-center text-gray-500 text-sm animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Atualizando dados...
                </div>
              )}
              
              {!loading && dadosOrganizados && totalServidores > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportXLSX}
                    variant="outline"
                    className="border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016]/5"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar XLSX
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#2D5016] hover:bg-[#1a320d] text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Sincronizar Planilha Existente
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW */}
      {dadosOrganizados && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-sm border border-gray-100 overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Pré-visualização — {MESES[parseInt(mes) - 1]} / {ano}
                </CardTitle>
                <Badge variant="outline" className="text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                  {totalServidores} servidor(es) • {dadosRelatorio?.length || 0} plantões • {daysInMonth} dias
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {totalServidores === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum dado para exibir</p>
                  <p className="text-sm">Não há agendamentos aprovados neste mês.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-white">
                        <th className="sticky left-0 z-10 bg-zinc-900 px-2 py-2.5 text-center font-bold border-r border-zinc-700 min-w-[40px]">Nº</th>
                        <th className="sticky left-[40px] z-10 bg-zinc-900 px-3 py-2.5 text-left font-bold border-r border-zinc-700 min-w-[180px]">NOME</th>
                        <th className="sticky left-[220px] z-10 bg-zinc-900 px-2 py-2.5 text-center font-bold border-r border-zinc-700 min-w-[90px]">PLANTÃO</th>
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <th key={i + 1} className="px-1.5 py-2.5 text-center font-bold border-r border-zinc-700 min-w-[36px]">
                            {i + 1}
                          </th>
                        ))}
                        <th className="px-2 py-2.5 text-center font-bold min-w-[60px]">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let numero = 1;
                        const rowElements = [];

                        PLANTAO_ORDER.forEach(plantao => {
                          const servidores = dadosOrganizados[plantao];
                          if (servidores.length === 0) return;

                          // Linha de título do bloco
                          const label = plantao === 'Outras Unidades' 
                            ? 'OUTRAS UNIDADES' 
                            : plantao === 'Administrativo' 
                              ? 'ADMINISTRATIVO' 
                              : `PLANTÃO ${plantao}`;

                          rowElements.push(
                            <tr key={`header-${plantao}`} className={`${PLANTAO_COLORS_UI[plantao]} border-t-2 border-b`}>
                              <td className="sticky left-0 z-10 px-2 py-2" style={{ background: 'inherit' }}></td>
                              <td 
                                colSpan={3 + daysInMonth} 
                                className="px-3 py-2 font-extrabold text-sm tracking-wide"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${PLANTAO_DOTS[plantao]}`} />
                                  {label}
                                </div>
                              </td>
                            </tr>
                          );

                          servidores.forEach((serv, idx) => {
                            const isEven = idx % 2 === 0;
                            const bgColor = isEven ? 'bg-white' : 'bg-zinc-50';
                            const stickyBg = isEven ? '#ffffff' : '#fafafa';

                            rowElements.push(
                              <tr key={serv.id} className={`border-b border-gray-100 ${bgColor} hover:bg-blue-50/40 transition-colors`}>
                                <td className="sticky left-0 z-10 px-2 py-2.5 text-center font-mono text-gray-400 border-r border-gray-100" style={{ background: stickyBg }}>
                                  {numero}
                                </td>
                                <td className="sticky left-[40px] z-10 px-3 py-2.5 font-semibold text-gray-800 border-r border-gray-100 whitespace-nowrap" style={{ background: stickyBg }}>
                                  {serv.nome}
                                </td>
                                <td className="sticky left-[220px] z-10 px-2 py-2.5 text-center border-r border-gray-100" style={{ background: stickyBg }}>
                                  <Badge variant="secondary" className="text-[9px] font-bold bg-white border-zinc-200 text-zinc-500 shadow-none px-1.5 h-5 uppercase">
                                    {serv.plantao}
                                  </Badge>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, d) => {
                                  const valor = serv.dias[d + 1] || '';
                                  return (
                                    <td key={d + 1} className="px-1 py-2 text-center border-r border-gray-100">
                                      {valor && (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          valor.includes('Duplo') || valor.includes('/')
                                            ? 'bg-amber-100 text-amber-700'
                                            : valor === 'RD' 
                                            ? 'bg-[#2D5016]/10 text-[#2D5016]' 
                                            : 'bg-indigo-100 text-indigo-700'
                                        }`}>
                                          {valor}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-50/30">
                                  {serv.totalShifts}
                                </td>
                              </tr>
                            );
                            numero++;
                          });
                        });

                        return rowElements;
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* MODAL DE SINCRONIZAÇÃO */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#2D5016]">Sincronizar Planilha</DialogTitle>
            <DialogDescription>
              Selecione a aba da planilha enviada que corresponde ao mês de <strong>{MESES[parseInt(mes) - 1]}/{ano}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="font-bold text-zinc-700 block mb-3">Selecione a Aba (Página):</Label>
            <div className="max-height-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar" style={{ maxHeight: '280px' }}>
              {syncSheets.map((sheet, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedSyncSheet(sheet)}
                  className={`
                    cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center justify-between
                    ${selectedSyncSheet === sheet 
                      ? 'border-[#2D5016] bg-[#2D5016]/5 shadow-sm' 
                      : 'border-zinc-100 bg-zinc-50/30 hover:border-zinc-300 hover:bg-zinc-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${selectedSyncSheet === sheet ? 'bg-[#2D5016] text-white' : 'bg-zinc-200 text-zinc-500'}
                    `}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-semibold ${selectedSyncSheet === sheet ? 'text-[#2D5016]' : 'text-zinc-600'}`}>
                      {sheet}
                    </span>
                  </div>
                  {selectedSyncSheet === sheet && (
                    <div className="w-2 h-2 rounded-full bg-[#2D5016] animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSyncConfirm} className="bg-[#2D5016] hover:bg-[#1a320d] text-white">
              Sincronizar e Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelatorioXLSX;
