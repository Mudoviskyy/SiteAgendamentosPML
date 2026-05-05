
export const validateNome = (nome) => {
  if (!nome || !nome.trim()) {
    return { isValid: false, error: 'Nome completo é obrigatório' };
  }
  const parts = nome.trim().split(/\s+/);
  if (parts.length < 2) {
    return { isValid: false, error: 'Digite seu nome e sobrenome' };
  }
  if (nome.length < 5) {
    return { isValid: false, error: 'Nome muito curto' };
  }
  return { isValid: true, error: '' };
};

export const validateCPF = (cpf) => {
  if (!cpf) return { isValid: false, error: 'CPF é obrigatório' };
  
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) {
    return { isValid: false, error: 'CPF deve conter 11 dígitos' };
  }

  // Check for repeated digits
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, error: 'CPF inválido (dígitos repetidos)' };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, error: 'CPF inválido' };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, error: 'CPF inválido' };
  }

  return { isValid: true, error: '' };
};

// NOVO: validarDocumento (Suporta CPF e Estrangeiro)
export const validarDocumento = (valor, tipo = 'CPF') => {
  if (tipo === 'DOCUMENTO_ESTRANGEIRO') {
    if (!valor) return { isValid: false, error: 'Documento é obrigatório' };
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length < 5) return { isValid: false, error: 'Documento inválido' };
    return { isValid: true, error: '' };
  }
  return validateCPF(valor);
};

export const validateDataNascimento = (data) => {
  if (!data) {
    return { isValid: false, error: 'Data de nascimento é obrigatória' };
  }

  let dateObj;

  if (data.includes('/')) {
    const regexBR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = data.match(regexBR);

    if (!match) {
      return { isValid: false, error: 'Formato inválido' };
    }

    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const ano = parseInt(match[3], 10);

    dateObj = new Date(ano, mes - 1, dia);

    if (
      dateObj.getFullYear() !== ano ||
      dateObj.getMonth() !== mes - 1 ||
      dateObj.getDate() !== dia
    ) {
      return { isValid: false, error: 'Data inexistente' };
    }

  } else if (data.includes('-')) {
    dateObj = new Date(data + "T00:00:00");
    if (isNaN(dateObj.getTime())) {
      return { isValid: false, error: 'Data inválida' };
    }
  } else {
    return { isValid: false, error: 'Formato inválido' };
  }

  const today = new Date();

  if (dateObj > today) {
    return { isValid: false, error: 'Data não pode ser futura' };
  }

  let age = today.getFullYear() - dateObj.getFullYear();
  const m = today.getMonth() - dateObj.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
    age--;
  }

  if (age < 18) {
    return { isValid: false, error: 'Você deve ser maior de 18 anos' };
  }

  if (age > 120) {
    return { isValid: false, error: 'Data de nascimento inválida' };
  }

  return { isValid: true, error: '' };
};

export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'Email é obrigatório' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Formato de email inválido' };
  }
  
  return { isValid: true, error: '' };
};

export const validateTelefone = (telefone) => {
  if (!telefone) {
    return { isValid: false, error: "Telefone é obrigatório" };
  }

  const telefoneLimpo = telefone.replace(/\D/g, "");

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    return { isValid: false, error: "Telefone deve conter DDD + número" };
  }

  return { isValid: true, error: "" };
};

// NOVO: validarTelefone (Suporta BR e Internacional)
export const validarTelefone = (valor, tipo = 'BR') => {
  if (!valor) return { isValid: false, error: "Telefone é obrigatório" };
  
  const telefoneLimpo = valor.replace(/\D/g, "");

  if (tipo === 'INTERNACIONAL') {
    if (telefoneLimpo.length < 6) return { isValid: false, error: "Telefone muito curto" };
    return { isValid: true, error: "" };
  }

  return validateTelefone(valor);
};

export const validateSenha = (senha) => {
  if (!senha) return { isValid: false, error: 'Senha é obrigatória' };
  
  if (senha.length < 8) {
    return { isValid: false, error: 'Mínimo de 8 caracteres' };
  }
  if (senha.length > 50) {
    return { isValid: false, error: 'Máximo de 50 caracteres' };
  }
  if (!/[A-Z]/.test(senha)) {
    return { isValid: false, error: 'Requer letra maiúscula' };
  }
  if (!/[a-z]/.test(senha)) {
    return { isValid: false, error: 'Requer letra minúscula' };
  }
  if (!/[0-9]/.test(senha)) {
    return { isValid: false, error: 'Requer número' };
  }
  if (!/[!@#$%^&*]/.test(senha)) {
    return { isValid: false, error: 'Requer caractere especial (!@#$%^&*)' };
  }

  return { isValid: true, error: '' };
};

export const validatePassword = validateSenha;

export const validateConfirmaSenha = (senha, confirmaSenha) => {
  if (!confirmaSenha) return { isValid: false, error: 'Confirmação de senha é obrigatória' };
  if (senha !== confirmaSenha) {
    return { isValid: false, error: 'As senhas não coincidem' };
  }
  return { isValid: true, error: '' };
};

export const validateAllFields = (formData, tipoIdentificacao = 'CPF', tipoTelefone = 'BR') => {
  const errors = {};
  let isValid = true;
  let firstErrorField = null;

  const nomeValidation = validateNome(formData.nome);
  if (!nomeValidation.isValid) {
    errors.nome = nomeValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'nome';
  }

  const cpfValidation = validarDocumento(formData.cpf, tipoIdentificacao);
  if (!cpfValidation.isValid) {
    errors.cpf = cpfValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'cpf';
  }

  const dataValidation = validateDataNascimento(formData.dataNascimento);
  if (!dataValidation.isValid) {
    errors.dataNascimento = dataValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'dataNascimento';
  }

  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'email';
  }

  const telefoneValidation = validarTelefone(formData.telefone, tipoTelefone);
  if (!telefoneValidation.isValid) {
    errors.telefone = telefoneValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'telefone';
  }

  const senhaValidation = validateSenha(formData.senha);
  if (!senhaValidation.isValid) {
    errors.senha = senhaValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'senha';
  }

  const confirmValidation = validateConfirmaSenha(formData.senha, formData.confirmaSenha);
  if (!confirmValidation.isValid) {
    errors.confirmaSenha = confirmValidation.error;
    isValid = false;
    if (!firstErrorField) firstErrorField = 'confirmaSenha';
  }

  return { isValid, errors, firstErrorField };
};
