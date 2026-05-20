import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export const norm = (str) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(arrayBuffer).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + "\n";
  }
  return fullText;
};

export const extractItemsFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(arrayBuffer).promise;
  const allItems = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      const text = item.str.trim();
      if (!text) continue;
      allItems.push({
        text,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width),
        page: p,
      });
    }
  }

  return allItems;
};

// ---------------------------------------------
// Parsers
// ---------------------------------------------

export const parsear15 = (texto) => {
  let bruto = String(texto || '');
  bruto = bruto.replace(/(GAL:\s*[A-Z])/g, '\n$1');
  bruto = bruto.replace(/(^|[^\d])(\d{6}\s+)/g, (match, p1, p2) => p1 + '\n' + p2);

  const linhas = bruto.split('\n').map(l => l.trim()).filter(Boolean);
  const registros = [];
  let galeriaAtual = '';

  const ehLinhaAdministrativa = (l) => [
    /^ESTADO DE/i, /^SECRETARIA DE/i, /^POLICIA PENAL/i, /^SISTEMA DE/i,
    /^UNIDADE:/i, /^PRONTUARIOS/i, /^IMPRESSO EM/i, /^TOTAL /i, /^i-PEN/i
  ].some(rx => rx.test(l));

  const temCaraDeOcorrencia = (l) => {
    if (/[()|:/]/.test(l) && !l.includes('GAL:')) return true;
    if (/\d{2}\/\d{2}\/\d{4}/.test(l)) return true;
    return /\b(CONSULTA|SAIDA|TRABALHO|PUNICAO|PARLATORIO|PRIMEIRA|FASE)\b/i.test(l);
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const matchGal = linha.match(/GAL:\s*([A-Z])/i);
    if (matchGal) {
      galeriaAtual = matchGal[1].toUpperCase();
      continue;
    }

    const matchPreso = linha.match(/^(\d{6})\s+(.+)$/);
    if (matchPreso && galeriaAtual) {
      const matricula = matchPreso[1];
      let nome = matchPreso[2];

      while (i + 1 < linhas.length) {
        const prox = linhas[i + 1];
        if (/^GAL:\s*[A-Z]/i.test(prox) || /^\d{6}\s+/.test(prox) ||
          ehLinhaAdministrativa(prox) || temCaraDeOcorrencia(prox)) break;
        nome += ' ' + prox;
        i++;
      }

      nome = nome
        .replace(/\s+(CONSULTA|SAIDA|TRABALHO|PUNICAO|PARLATORIO|PRIMEIRA)\b.*$/i, '')
        .replace(/[^A-Z�-��' -]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      if (nome && nome.length > 3) {
        registros.push({ matricula, nome, galeria: galeriaAtual });
      }
    }
  }

  if(registros.length === 0) throw new Error("Arquivo incorreto ou sem dados. Esperado Relatório 1.5.");

  const unique = [];
  const map = new Map();
  for (const item of registros) {
    if (!map.has(item.matricula)) {
      map.set(item.matricula, true);
      unique.push(item);
    }
  }
  return unique;
};

export const parsear19 = (texto) => {
  let bruto = String(texto || '');
  // Forçar nova linha antes de qualquer matrícula (6 dígitos)
  bruto = bruto.replace(/(^|[^\d])(\d{6}\s+)/g, (match, p1, p2) => p1 + '\n' + p2);
  
  const linhas = bruto.split('\n').map(l => l.trim()).filter(Boolean);
  const registros = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    // Regex mais flexível: tira o ^ se houver lixo antes, e permite que a galeria falte
    const match = linha.match(/(\d{6})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([MF])(?:\s+([A-Z0-9]))?/i);

    if (match) {
      const matricula = match[1];
      let nomeSituacao = match[2];
      const dataStr = match[3];
      const galeria = match[5] ? match[5].toUpperCase() : 'N/A';

      let nome = nomeSituacao
        .replace(/\s+(TRABALHO INTERNO|TRABALHO EXTERNO|RECOLHIDO\(A\)|SEMIABERTO|ABERTO|LIVRAMENTO CONDICIONAL|INTERNADO|ALBERGADO|NÒO INFORMADO|PROVISORIO|CONDENADO|REGIME ESPECIAL).*$/i, '')
        .replace(/[^A-Zì-�a�!' -]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      const [dia, mes, ano] = dataStr.split('/');
      const data_ingresso = `${ano}-${mes}-${dia}`;

      if (nome && nome.length > 3) {
        registros.push({ matricula, nome, galeria, data_ingresso });
      }
    }
  }

  if(registros.length === 0) throw new Error("Arquivo incorreto ou sem dados. Esperado Relatório 1.9.");

  const unique = [];
  const map = new Map();
  for (const item of registros) {
    if (!map.has(item.matricula)) {
      map.set(item.matricula, true);
      unique.push(item);
    }
  }
  return unique;
};

export const parsear213 = (texto) => {
  let bruto = String(texto || '');
  // Forçar nova linha antes de qualquer matrícula (6 dígitos)
  bruto = bruto.replace(/(^|[^\d])(\d{6}\s+)/g, (match, p1, p2) => p1 + '\n' + p2);

  const linhas = bruto.split('\n').map(l => l.trim()).filter(Boolean);
  const registros = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    // Captura matrícula, nome (o que está entre matrícula e data) e comportamento
    const matchBase = linha.match(/(\d{6})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(Bom|Ruim|Regular|�timo|Péssimo|Excelente|Muito Bom)?\s*A:/i);

    if (matchBase) {
      const matricula = matchBase[1];
      const nomeRaw = matchBase[2];
      const comportamento = matchBase[4] ? matchBase[4].trim() : null;
      
      // Limpeza básica do nome
      const nome = nomeRaw.replace(/[^A-Zì-�a�!' -]/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

      if (nome && nome.length > 3) {
        registros.push({ matricula, nome, comportamento });
      }
    }
  }

  if(registros.length === 0) throw new Error("Arquivo incorreto ou sem dados. Esperado Relatório 2.13.");

  const unique = [];
  const map = new Map();
  for (const item of registros) {
    if (!map.has(item.matricula)) {
      map.set(item.matricula, true);
      unique.push(item);
    }
  }
  return unique;
};

export const parsear86 = (allItems, periodoRef) => {
  const headerKeywords = {
    'VISITA': 'visita', 'ENTRADA': 'entrada', 'SAIDA': 'saida', 'VISITANTE': 'visitante',
    'DETENTO': 'detento', 'TIPO': 'tipo', 'UNIDADE': 'unidade', 'SITUACAO': 'situacao',
  };

  const columnX = {};
  let headerY = null;

  for (const item of allItems) {
    const n = norm(item.text);
    for (const [keyword, colName] of Object.entries(headerKeywords)) {
      if (n === keyword || n.startsWith(keyword)) {
        if (!columnX[colName]) {
          columnX[colName] = item.x;
          if (!headerY || item.page === 1) headerY = item.y;
        }
      }
    }
  }

  const colNames = Object.keys(columnX);
  if (colNames.length < 4) {
    throw new Error(`Não foi possível identificar colunas. Esperado Relatório 8.6.`);
  }

  const sortedCols = Object.entries(columnX).sort(([, a], [, b]) => a - b);
  const getColumn = (x) => {
    for (let i = sortedCols.length - 1; i >= 0; i--) {
      if (x >= sortedCols[i][1] - 15) return sortedCols[i][0];
    }
    return sortedCols[0]?.[0] || 'unknown';
  };

  const dataItems = allItems.filter(item => {
    if (item.page === 1 && headerY && item.y >= headerY - 2) return false;
    const n = norm(item.text);
    if (Object.keys(headerKeywords).some(k => n === k || n.startsWith(k))) return false;
    if (n.includes('IMPRESSO EM') || n.startsWith('PAGINA') || n.includes('SISTEMA DE IDENT')) return false;
    if (n.includes('ESTADO DE SANTA') || n.includes('SECRETARIA') || n.includes('POLICIA PENAL')) return false;
    if (n.includes('ARGUMENTOS') || n.includes('PESQUISA POR') || n.includes('PERIODO')) return false;
    if (n.startsWith('RESULTADO') || n.startsWith('TOTAL')) return false;
    return true;
  });

  const yTolerance = 3;
  const rowMap = new Map();
  for (const item of dataItems) {
    const yKey = Math.round(item.y / yTolerance) * yTolerance;
    const key = `${item.page}_${yKey}`;
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key).push(item);
  }

  const sortedRows = [...rowMap.entries()]
    .map(([key, items]) => {
      const [page, y] = key.split('_').map(Number);
      return { page, y, items };
    })
    .sort((a, b) => a.page - b.page || b.y - a.y);

  const parsedRows = sortedRows.map(row => {
    const cols = {};
    for (const item of row.items) {
      const col = getColumn(item.x);
      if (!cols[col]) cols[col] = '';
      cols[col] += (cols[col] ? ' ' : '') + item.text;
    }
    return cols;
  });

  const regexDate = /(\d{2}\/\d{2}\/\d{4})/;
  const registros = [];
  let current = null;

  for (const row of parsedRows) {
    const visitaText = row.visita || '';
    const dateMatch = visitaText.match(regexDate);

    if (dateMatch) {
      if (current) registros.push(current);
      const timesInVisita = visitaText.match(/\d{2}:\d{2}:\d{2}/g) || [];
      current = {
        data_str: dateMatch[1],
        hora_entrada: row.entrada || timesInVisita[0] || '',
        hora_saida: row.saida || timesInVisita[1] || '',
        visitante: row.visitante || '',
        detento: row.detento || '',
        tipo: row.tipo || '',
        unidade: row.unidade || '',
        situacao: row.situacao || '',
      };
    } else if (current) {
      if (row.visitante) current.visitante += ' ' + row.visitante;
      if (row.detento) current.detento += ' ' + row.detento;
      if (row.tipo) current.tipo += ' ' + row.tipo;
      if (row.unidade) current.unidade += ' ' + row.unidade;
      if (row.situacao) current.situacao += ' ' + row.situacao;
      if (row.entrada && !current.hora_entrada) current.hora_entrada = row.entrada;
      if (row.saida && !current.hora_saida) current.hora_saida = row.saida;
    }
  }
  if (current) registros.push(current);

  const situacoesNorm = { 'CONCLUIDA': 'CONCLUÍDA', 'CANCELADA': 'CANCELADA', 'EM ANDAMENTO': 'EM ANDAMENTO', 'PENDENTE': 'PENDENTE', 'AGENDADA': 'AGENDADA' };
  const resultado = [];

  for (const reg of registros) {
    const [dia, mes, ano] = reg.data_str.split('/');
    const dataISO = `${ano}-${mes}-${dia}`;
    const cleanName = (n) => n.replace(/\d{5,6}/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    const nomeVisitante = cleanName(reg.visitante);
    const nomeDetento = cleanName(reg.detento);
    const matrVisitante = reg.visitante.match(/(\d{5,6})/)?.[1] || null;
    const matrDetento = reg.detento.match(/(\d{5,6})/)?.[1] || null;

    const sitNorm = norm(reg.situacao);
    let situacaoFinal = 'NÒO INFORMADA';
    for (const [key, val] of Object.entries(situacoesNorm)) {
      if (sitNorm.includes(norm(key))) { situacaoFinal = val; break; }
    }

    let tipoFinal = reg.tipo.replace(/\s+/g, ' ').trim().toUpperCase() || 'NÒO INFORMADO';

    if (!nomeVisitante || !nomeDetento) continue;

    const autoPeriodoRef = dataISO.substring(0, 7);

    resultado.push({
      data_visita: dataISO,
      hora_entrada: (reg.hora_entrada || '').replace(/[^\d:]/g, '').substring(0, 8),
      hora_saida: (reg.hora_saida || '').replace(/[^\d:]/g, '').substring(0, 8),
      nome_visitante: nomeVisitante,
      nome_visitante_normalizado: norm(nomeVisitante),
      matricula_visitante: matrVisitante,
      nome_detento: nomeDetento,
      nome_detento_normalizado: norm(nomeDetento),
      matricula_detento: matrDetento,
      tipo_visita: tipoFinal,
      situacao: situacaoFinal,
      unidade: reg.unidade.trim() || null,
      periodo_ref: autoPeriodoRef,
    });
  }

  const concluidas = resultado.filter(r => r.situacao === 'CONCLUÍDA');
  if(concluidas.length === 0 && resultado.length === 0) throw new Error("Arquivo incorreto ou sem dados. Esperado Relatório 8.6.");

  return concluidas;
};

export const parsear813 = (allItems, periodoRef) => {
  const normLocal = (str) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

  // ── 1. Detect column X positions from header keywords ──────────────────────
  const headerKeywords = {
    REEDUCANDO: "reeducando",
    VISITANTE:  "visitante",
    VINCULO:    "vinculo",
    PARENTESCO: "vinculo",
  };

  const columnX = {};
  let headerY = null;

  for (const item of allItems) {
    const text = item.text || item.str || "";
    const n = normLocal(text);
    for (const [keyword, colName] of Object.entries(headerKeywords)) {
      if ((n === keyword || n.startsWith(keyword)) && !columnX[colName]) {
        columnX[colName] = item.x;
        if (item.page === 1 && !headerY) headerY = item.y;
      }
    }
  }

  if (!columnX.reeducando || !columnX.visitante || !columnX.vinculo) {
    throw new Error("Colunas insuficientes no PDF. Verifique se é o Relatório 8.13 (Relação de Parentesco).");
  }

  // Column boundaries derived from header positions
  const xReeducando = columnX.reeducando;
  const xVisitante  = columnX.visitante;
  const xVinculo    = columnX.vinculo;

  const getColumn = (x) => {
    if (x < xVisitante - 5) return "reeducando";
    if (x < xVinculo   - 5) return "visitante";
    return "vinculo";
  };

  // ── 2. Filter header / footer / housing rows ────────────────────────────────
  const isHousingText = (n) =>
    n.startsWith("GALERIA:") || n.startsWith("CELA:") || n.startsWith("BLOCO:") ||
    n.startsWith("PISO:")    || n.startsWith("RESIDENCIA:") || n.startsWith("ALA:");

  const dataItems = allItems.filter(item => {
    const text = item.text || item.str || "";
    if (!text.trim()) return false;
    if (item.page === 1 && headerY && item.y >= headerY - 2) return false;
    const n = normLocal(text);
    if (Object.keys(headerKeywords).some(k => n === k || n.startsWith(k))) return false;
    if (n.includes("IMPRESSO EM") || n.startsWith("PAGINA") || n.includes("VISITANTES POR")) return false;
    if (n.includes("ESTADO DE SANTA") || n.includes("SECRETARIA") || n.includes("POLICIA PENAL")) return false;
    if (n.startsWith("RESULTADO") || n.startsWith("TOTAL") || n.startsWith("WWW.")) return false;
    if (isHousingText(n)) return false;
    // Drop single-character noise in reeducando column (GALERIA letter, cell number)
    if (text.length === 1 && item.x < xVisitante) return false;
    return true;
  });

  // ── 3. Group items into rows by Y coordinate ────────────────────────────────
  const yTolerance = 3;
  const rowMap = new Map();
  for (const item of dataItems) {
    const yKey = Math.round(item.y / yTolerance) * yTolerance;
    const key = `${item.page}_${yKey}`;
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key).push(item);
  }

  const sortedRows = [...rowMap.entries()]
    .map(([key, items]) => {
      const [page, y] = key.split("_").map(Number);
      return { page, y, items };
    })
    .sort((a, b) => a.page - b.page || b.y - a.y);

  // ── 4. Assign columns and build parsedRows ──────────────────────────────────
  const parsedRows = sortedRows.map(row => {
    const cols = {};
    for (const item of row.items) {
      const text = item.text || item.str || "";
      const col = getColumn(item.x);
      if (!cols[col]) cols[col] = "";
      cols[col] += (cols[col] ? " " : "") + text;
    }
    return cols;
  });

  // ── 5. Carry-forward prisoner + extract visitor records ─────────────────────
  const resultado = [];
  let currentMatricula = null;
  let currentNomePreso = null;

  for (const row of parsedRows) {
    const reeducandoRaw = (row.reeducando || "").trim();

    // Prisoner header: exactly 6 digits + name in the reeducando column
    const matrMatch = reeducandoRaw.match(/^(\d{6})\s+(.+)/);
    if (matrMatch) {
      currentMatricula = matrMatch[1];
      // Strip any accidentally appended housing info
      let nomePreso = matrMatch[2]
        .replace(/\s+(GALERIA|CELA|BLOCO|PISO|RESIDENCIA|ALA)\s*:.*$/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
      currentNomePreso = nomePreso;
    }

    if (!currentMatricula) continue;

    const visitanteRaw = (row.visitante || "").trim();
    if (!visitanteRaw) continue;

    // Prontuário IPEN: short number (≤6 digits) at the start of the visitante cell.
    // CPFs have 11 digits – we deliberately limit the match to ≤6 digits so CPFs
    // are never mistaken for prontuários.
    const prontMatch = visitanteRaw.match(/^(\d{1,6})\s+[A-Z]/);
    const prontuarioVisitante = prontMatch ? prontMatch[1] : null;

    // Remove the leading number (prontuário) to get only the visitor name
    const nomeVisitante = visitanteRaw
      .replace(/^\d{1,6}\s+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    if (!nomeVisitante || nomeVisitante.length < 4) continue;

    const vinculo = (row.vinculo || "Não Identificado").replace(/\s+/g, " ").trim();

    resultado.push({
      matricula_preso:            currentMatricula,
      nome_preso:                 currentNomePreso,
      nome_visitante:             nomeVisitante,
      nome_visitante_normalizado: normLocal(nomeVisitante),
      vinculo,
      periodo_ref:                periodoRef,
      prontuario_visitante:       prontuarioVisitante,
    });
  }

  if (resultado.length === 0) throw new Error("Arquivo incorreto ou sem dados. Esperado Relatório 8.13.");
  return resultado;
};