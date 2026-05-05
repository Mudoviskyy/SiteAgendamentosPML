
export const TIPOS_IDENTIFICACAO = {
  CPF: 'CPF',
  ESTRANGEIRO: 'DOCUMENTO_ESTRANGEIRO'
};

export const TIPOS_TELEFONE = {
  BR: 'BR',
  INTERNACIONAL: 'INTERNACIONAL'
};

export const DDIS = [
  { label: "+55 Brasil", value: "55" },
  { label: "+54 Argentina", value: "54" },
  { label: "+591 Bolívia", value: "591" },
  { label: "+57 Colômbia", value: "57" },
  { label: "+592 Guiana", value: "592" },
  { label: "+594 Guiana Francesa", value: "594" },
  { label: "+595 Paraguai", value: "595" },
  { label: "+51 Peru", value: "51" },
  { label: "+597 Suriname", value: "597" },
  { label: "+598 Uruguai", value: "598" },
  { label: "+58 Venezuela", value: "58" },
  { label: "+1 Outro/EUA-Canadá", value: "1" }
];

export const getIdentificacaoLabel = (tipo) => {
  return tipo === TIPOS_IDENTIFICACAO.ESTRANGEIRO ? 'Documento Estrangeiro' : 'CPF';
};

export const getIdentificacaoPlaceholder = (tipo) => {
  return tipo === TIPOS_IDENTIFICACAO.ESTRANGEIRO ? 'Apenas números' : '000.000.000-00';
};

export const normalizarDocumento = (valor) => {
  if (!valor) return '';
  return valor.replace(/\D/g, '');
};

export const getTelefoneExibivel = (telefone, tipo) => {
  if (!telefone) return '';
  
  if (tipo === TIPOS_TELEFONE.INTERNACIONAL) {
    // Tenta formatar se tiver o formato ddi+numero (ex: 595 981234567)
    // Como armazenamos apenas números, vamos colocar um + na frente
    return `+${telefone}`;
  }
  
  // Formato BR
  let t = telefone.replace(/\D/g, '');
  if (t.length === 11) {
    return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  } else if (t.length === 10) {
    return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  }
  return telefone;
};

export const concatenarTelefoneInternacional = (ddi, numero) => {
  const ddiClean = (ddi || '').replace(/\D/g, '');
  const numClean = (numero || '').replace(/\D/g, '');
  return `${ddiClean}${numClean}`;
};

export const extrairDDIeNumero = (telefone) => {
  const clean = (telefone || '').replace(/\D/g, '');
  // Tenta encontrar um DDI correspondente (ordena por tamanho decrescente para não pegar 5 antes de 55)
  const ddisOrdenados = [...DDIS].sort((a, b) => b.value.length - a.value.length);
  
  for (const ddiObj of ddisOrdenados) {
    if (clean.startsWith(ddiObj.value)) {
      return {
        ddi: ddiObj.value,
        numero: clean.substring(ddiObj.value.length)
      };
    }
  }
  
  // Fallback
  return { ddi: '55', numero: clean };
};
