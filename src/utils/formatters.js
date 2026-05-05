
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const maskCPF = (value) => {
  return formatCPF(value);
};

export const unmaskCPF = (value) => {
  return value ? value.replace(/\D/g, '') : '';
};

export const maskTelefone = (value) => {
  if (!value) return "";

  // remove tudo que não for número
  let telefone = value.replace(/\D/g, "");

  // limita a 11 dígitos
  telefone = telefone.slice(0, 11);

  // celular (11 dígitos)
  if (telefone.length > 10) {
    return telefone.replace(
      /^(\d{2})(\d{5})(\d{0,4})$/,
      (match, ddd, parte1, parte2) => {
        if (parte2) return `(${ddd}) ${parte1}-${parte2}`;
        return `(${ddd}) ${parte1}`;
      }
    );
  }

  // fixo (10 dígitos)
  if (telefone.length > 6) {
    return telefone.replace(
      /^(\d{2})(\d{4})(\d{0,4})$/,
      (match, ddd, parte1, parte2) => {
        if (parte2) return `(${ddd}) ${parte1}-${parte2}`;
        return `(${ddd}) ${parte1}`;
      }
    );
  }

  if (telefone.length > 2) {
    return telefone.replace(/^(\d{2})(\d+)/, "($1) $2");
  }

  return telefone;
};

// NEW FORMATTERS FOR INTERNATIONAL SUPPORT
export const formatTelefoneExibivel = (telefone, tipo = 'BR') => {
  if (!telefone) return '';
  if (tipo === 'INTERNACIONAL') {
    return `+${telefone}`;
  }
  return maskTelefone(telefone);
};

export const formatDocumento = (documento, tipo = 'CPF') => {
  if (!documento) return '';
  if (tipo === 'DOCUMENTO_ESTRANGEIRO') {
    return documento.replace(/\D/g, '');
  }
  return formatCPF(documento);
};

// CORREÇÃO DO TIMEZONE BUG
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Se a string já estiver no formato DD/MM/YYYY, não mexe
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    // Replace space with 'T' for string timestamps like "2025-09-10 12:00:00+00"
    let parsedString = typeof dateString === 'string' ? dateString.replace(' ', 'T') : dateString;

    // Cria o objeto Date. Se for apenas YYYY-MM-DD, o JS já trata como UTC.
    // Se for ISO completo, precisamos extrair a parte UTC.
    const date = new Date(parsedString);
    
    if (isNaN(date.getTime())) return dateString;

    // Forçamos a exibição baseada no UTC para evitar o deslocamento local (UTC-3)
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  // Check if it's already HH:MM
  if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatStatus = (status) => {
  const statusMap = {
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'rejeitado': 'Rejeitado',
    'cancelado': 'Cancelado',
    'realizado': 'Realizado'
  };
  return statusMap[status?.toLowerCase()] || status;
};
