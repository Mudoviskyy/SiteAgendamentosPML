
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, User, Mail, Calendar, Lock, AlertCircle, Check, X, ShieldCheck, AlertTriangle 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  validateNome, validateDataNascimento, validateSenha, validateConfirmaSenha, 
  validateAllFields, validarDocumento, validarTelefone, validateEmail as originalValidateEmail
} from '@/utils/validators';
import { signUpVisitor, checkCPFExists, checkEmailExists } from '@/services/visitanteService';
import { cn } from '@/lib/utils';
import { 
  TIPOS_IDENTIFICACAO, TIPOS_TELEFONE, DDIS, getIdentificacaoLabel, 
  getIdentificacaoPlaceholder, normalizarDocumento, getTelefoneExibivel, concatenarTelefoneInternacional
} from '@/utils/identificacao';

const ALLOWED_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'icloud.com', 'live.com', 'bol.com.br', 'uol.com.br', 'terra.com.br', 
  'ig.com.br', 'msn.com', 'globomail.com', 'proton.me', 'protonmail.com'
];

const validateEmail = (email) => {
  const result = originalValidateEmail(email);
  if (result.isValid) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && !ALLOWED_DOMAINS.includes(domain)) {
      return { isValid: false, error: 'Provedor não aceito. Verifique erros de digitação ou use provedores conhecidos.' };
    }
  }
  return result;
};

const CadastroVisitantePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tipoIdentificacao, setTipoIdentificacao] = useState(TIPOS_IDENTIFICACAO.CPF);
  const [tipoTelefone, setTipoTelefone] = useState(TIPOS_TELEFONE.BR);
  const [ddiSelecionado, setDdiSelecionado] = useState('55');

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    email: '',
    confirmarEmail: '',
    senha: '',
    confirmaSenha: ''
  });
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [formStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');

  const submitAttemptRef = useRef(false);

  const formatarDataParaISO = (data) => {
    if (!data) return data;
    if (data.includes('-')) return data;
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    return data;
  };

  const formatarData = (value) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length >= 5) return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    if (v.length >= 3) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return v;
  };

  const handleTipoIdentificacaoChange = (novoTipo) => {
    setTipoIdentificacao(novoTipo);
    setFormData(prev => ({ ...prev, cpf: '' }));
    setErrors(prev => ({ ...prev, cpf: '' }));
    
    if (novoTipo === TIPOS_IDENTIFICACAO.ESTRANGEIRO) {
      setTipoTelefone(TIPOS_TELEFONE.INTERNACIONAL);
      setDdiSelecionado('55');
    } else {
      setTipoTelefone(TIPOS_TELEFONE.BR);
      setDdiSelecionado('55');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "nome" || name === "nome_completo") {
      newValue = value.replace(/[0-9]/g, "");
    }
    if (name === 'cpf') {
      if (tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF) {
        let t = value.replace(/\D/g, '');
        if(t.length > 11) t = t.slice(0,11);
        newValue = t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if(t.length < 11) newValue = value; 
      } else {
        newValue = normalizarDocumento(value);
      }
    }
    if (name === 'telefone') {
      if (tipoTelefone === TIPOS_TELEFONE.BR) {
         let t = value.replace(/\D/g, "");
         if (t.length > 11) t = t.slice(0, 11);
         if (t.length > 10) newValue = t.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
         else if (t.length > 6) newValue = t.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
         else if (t.length > 2) newValue = t.replace(/^(\d{2})(\d+)/, '($1) $2');
         else newValue = t;
      } else {
         newValue = normalizarDocumento(value);
      }
    }
    if (name === 'dataNascimento') newValue = formatarData(value);

    const updatedFormData = { ...formData, [name]: newValue };
    setFormData(updatedFormData);

    let validationResult;
    switch(name) {
      case 'nome': validationResult = validateNome(newValue); break;
      case 'cpf': validationResult = validarDocumento(newValue, tipoIdentificacao); break;
      case 'dataNascimento':
        validationResult = (newValue && newValue.length === 10) ? validateDataNascimento(newValue) : { isValid: true, error: '' };
        break;
      case 'email': validationResult = validateEmail(newValue); break;
      case 'confirmarEmail': 
        validationResult = newValue === updatedFormData.email ? { isValid: true } : { isValid: false, error: 'Os e-mails não coincidem' };
        break;
      case 'telefone': validationResult = validarTelefone(newValue, tipoTelefone); break;
      case 'senha': validationResult = validateSenha(newValue); break;
      case 'confirmaSenha': validationResult = validateConfirmaSenha(updatedFormData.senha, newValue); break;
      default: validationResult = { isValid: true, error: '' };
    }

    setErrors(prev => ({ ...prev, [name]: validationResult.isValid ? '' : validationResult.error }));

    if (name === 'senha' && formData.confirmaSenha) {
       const confirmResult = validateConfirmaSenha(newValue, formData.confirmaSenha);
       setErrors(prev => ({ ...prev, confirmaSenha: confirmResult.isValid ? '' : confirmResult.error }));
    }

    if (name === 'email' && formData.confirmarEmail) {
      setErrors(prev => ({ ...prev, confirmarEmail: newValue === formData.confirmarEmail ? '' : 'Os e-mails não coincidem' }));
    }
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    let validationResult;
    switch(name) {
      case 'nome': validationResult = validateNome(value); break;
      case 'cpf': validationResult = validarDocumento(value, tipoIdentificacao); break;
      case 'dataNascimento':
        if (value.length !== 10) validationResult = { isValid: false, error: 'Preencha a data completa (DD/MM/AAAA)' };
        else validationResult = validateDataNascimento(value);
        break;
      case 'email': validationResult = validateEmail(value); break;
      case 'confirmarEmail':
        validationResult = value === formData.email ? { isValid: true } : { isValid: false, error: 'Os e-mails não coincidem' };
        break;
      case 'telefone': validationResult = validarTelefone(value, tipoTelefone); break;
      case 'senha': validationResult = validateSenha(value); break;
      case 'confirmaSenha': validationResult = validateConfirmaSenha(formData.senha, value); break;
      default: validationResult = { isValid: true, error: '' };
    }

    if (!validationResult.isValid) {
      setErrors(prev => ({ ...prev, [name]: validationResult.error }));
      return; 
    }

    if (name === 'email' && value) {
      try {
        const emailExists = await checkEmailExists(value);
        if (emailExists) setErrors(prev => ({ ...prev, email: 'Email já cadastrado no sistema' }));
      } catch (err) { console.error(err); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    const botField = formDataObj.get("website");

    if (botField) return;
    
    if (Date.now() - formStartTime < 4000) {
      toast({ title: "Erro", description: "Por favor, aguarde um momento antes de enviar.", variant: "destructive" });
      return;
    }

    if (!acceptedTerms) {
      toast({ title: "Atenção", description: "Você precisa aceitar a Política de Privacidade.", variant: "destructive" });
      return;
    }

    if (submitAttemptRef.current || isSubmitting || loading) return;
    
    setGeneralError('');
    setSuccessMessage('');

    const { isValid: initialIsValid, errors: validationErrors } = validateAllFields(formData, tipoIdentificacao, tipoTelefone);
    
    let isValid = initialIsValid;
    const finalErrors = { ...validationErrors };

    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (emailDomain && !ALLOWED_DOMAINS.includes(emailDomain)) {
      finalErrors.email = 'Provedor não aceito. Verifique erros de digitação.';
      isValid = false;
    }

    if (formData.email !== formData.confirmarEmail) {
      finalErrors.confirmarEmail = 'Os e-mails não coincidem';
      isValid = false;
    }

    if (!isValid) {
      setErrors(finalErrors);
      Object.keys(finalErrors).forEach(key => setTouched(prev => ({ ...prev, [key]: true })));
      return;
    }

    submitAttemptRef.current = true;
    setIsSubmitting(true);
    setLoading(true);

    try {
      const docExists = await checkCPFExists(formData.cpf, tipoIdentificacao);
      if (docExists) {
        setErrors(prev => ({ ...prev, cpf: 'Documento já cadastrado' }));
        throw new Error("Documento já cadastrado");
      }

      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors(prev => ({ ...prev, email: 'Email já cadastrado no sistema' }));
        throw new Error("Email já cadastrado no sistema");
      }

      const { confirmarEmail, ...dataToSend } = formData;
      const formDataCorrigido = {
        ...dataToSend,
        cpf: normalizarDocumento(formData.cpf),
        dataNascimento: formatarDataParaISO(formData.dataNascimento)
      };

      const result = await signUpVisitor(formDataCorrigido, tipoIdentificacao, tipoTelefone, ddiSelecionado);
      
      if (!result.success) {
        if (result.error.includes('rate limit') || result.error.includes('429')) {
          throw new Error("Muitas tentativas. Aguarde alguns minutos.");
        }
        throw new Error(result.error);
      }

      setSuccessMessage("Cadastro realizado com sucesso!");
      toast({ title: "Sucesso!", description: "Cadastro realizado com sucesso! Faça login para continuar.", className: "bg-green-600 text-white" });
      setTimeout(() => navigate('/login'), 2000);

    } catch (err) {
      const msg = err?.message || "Não foi possível concluir o cadastro.";
      if (msg.includes("Documento já cadastrado") || msg.includes("duplicate key")) {
        setErrors(prev => ({ ...prev, cpf: "Este documento já está cadastrado no sistema" }));
        toast({ title: "Documento já cadastrado", description: "O documento já existe no sistema. Faça login ou utilize outro.", variant: "destructive" });
      } else {
        setGeneralError(msg);
        toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
      submitAttemptRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getInputState = (fieldName) => {
    const isTouched = touched[fieldName];
    const hasError = !!errors[fieldName];
    const value = formData[fieldName];
    
    if (!isTouched && !value) return 'neutral';
    if (isTouched && hasError) return 'error';
    if (isTouched && !hasError && value) return 'success';
    if (value && !hasError) return 'success';
    return 'neutral';
  };

  const getInputStyles = (state) => {
    switch (state) {
      case 'error': return 'border-red-500 focus-visible:ring-red-500 pr-10';
      case 'success': return 'border-green-500 focus-visible:ring-green-500 pr-10';
      default: return 'border-gray-200 focus-visible:ring-gray-400 pr-10';
    }
  };

  const isFormValid = Object.values(formData).every(val => val !== '') && Object.values(errors).every(err => !err) && acceptedTerms;

  return (
    <>
      <Helmet><title>Cadastro - Presídio Masculino de Lages</title></Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-xl mx-auto w-full">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center text-gray-500 hover:text-[#2D5016] transition-colors mb-6 font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Crie sua Conta</h1>
            <p className="mt-2 text-gray-600">Presídio Masculino de Lages</p>
          </div>

          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-amber-900">
                  Atenção — Cadastro por Terceiros (Advogados, familiares, etc.)
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Se você está ajudando outra pessoa a se cadastrar, <strong>não use seu e-mail pessoal ou profissional</strong>. 
                  Crie um e-mail novo e exclusivo para a pessoa titular do cadastro.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Importante:</strong> Perder o acesso ao e-mail cadastrado significa perder o acesso à conta no sistema. 
                  Além disso, o e-mail informado será utilizado para o envio da <strong>carteirinha oficial</strong> do visitante.
                </p>
                <Link 
                  to="/faq" 
                  target="_blank"
                  className="inline-flex items-center text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 mt-1"
                >
                  📧 Veja como criar um e-mail gratuito no FAQ →
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm text-blue-800">
            <h3 className="font-bold uppercase text-[12px] tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Como fazer o seu cadastro
            </h3>
            <ul className="list-decimal ml-5 text-sm space-y-1">
              <li>Preencha todos os campos com seus dados reais e confira os erros.</li>
              <li>Informe um <strong>e-mail válido</strong> (somente provedores conhecidos são aceitos).</li>
              <li>Após finalizar, um <strong>link de confirmação</strong> será enviado para sua caixa de entrada.</li>
              <li>Acesse seu e-mail, clique no link de confirmação, aguardar aprovação administrativa somente.</li>
            </ul>
          </div>

          <Card className="shadow-xl border-t-4 border-t-[#2D5016]">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center">Cadastro de Visitante</CardTitle>
              <CardDescription className="text-center text-gray-500">Preencha os dados abaixo para solicitar acesso</CardDescription>
            </CardHeader>
            <CardContent>
              {generalError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{generalError}</p>
                </div>
              )}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-3 text-green-700">
                  <Check className="w-5 h-5 flex-shrink-0" /><p className="text-sm font-medium">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input type="text" name="website" className="opacity-0 absolute -z-50 w-0 h-0 pointer-events-none" tabIndex="-1" autoComplete="off" />
                
                {/* SELETOR DE TIPO DE DOCUMENTO */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleTipoIdentificacaoChange(TIPOS_IDENTIFICACAO.CPF)}
                    className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF ? "bg-white shadow text-[#2D5016]" : "text-gray-500 hover:text-gray-900")}
                  >
                    Brasileiro (CPF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoIdentificacaoChange(TIPOS_IDENTIFICACAO.ESTRANGEIRO)}
                    className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", tipoIdentificacao === TIPOS_IDENTIFICACAO.ESTRANGEIRO ? "bg-white shadow text-[#2D5016]" : "text-gray-500 hover:text-gray-900")}
                  >
                    Estrangeiro
                  </button>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-medium leading-none flex items-center gap-2">
                    <User className="w-4 h-4 text-[#2D5016]" /> Nome Completo
                  </label>
                  <div className="relative">
                    <Input name="nome" placeholder="Ex: Seu nome completo aqui" value={formData.nome} onChange={handleChange} onBlur={handleBlur} className={cn("h-11 transition-all", getInputStyles(getInputState('nome')))} disabled={loading || isSubmitting || !!successMessage} />
                    {getInputState('nome') === 'error' && <X className="w-4 h-4 text-red-500 absolute right-3 top-3.5" />}
                    {getInputState('nome') === 'success' && <Check className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />}
                  </div>
                  {errors.nome && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1">{errors.nome}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <span className="text-[#2D5016] font-bold">{getIdentificacaoLabel(tipoIdentificacao)}</span>
                    </label>
                    <div className="relative">
                      <Input name="cpf" placeholder={getIdentificacaoPlaceholder(tipoIdentificacao)} value={formData.cpf} onChange={handleChange} onBlur={handleBlur} maxLength={tipoIdentificacao === TIPOS_IDENTIFICACAO.CPF ? 14 : 20} className={cn("h-11 transition-all", getInputStyles(getInputState('cpf')))} disabled={loading || isSubmitting || !!successMessage} />
                      {getInputState('cpf') === 'error' && <X className="w-4 h-4 text-red-500 absolute right-3 top-3.5" />}
                      {getInputState('cpf') === 'success' && <Check className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />}
                    </div>
                    {errors.cpf && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1">{errors.cpf}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#2D5016]" /> Data Nascimento
                    </label>
                    <div className="relative">
                      <Input type="text" name="dataNascimento" placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric" value={formData.dataNascimento} onChange={handleChange} onBlur={handleBlur} className={cn("h-11 transition-all", getInputStyles(getInputState('dataNascimento')))} disabled={loading || isSubmitting || !!successMessage} />
                    </div>
                    {formData.dataNascimento.length === 10 && errors.dataNascimento && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1">{errors.dataNascimento}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#2D5016]" /> Email
                    </label>
                    <div className="relative">
                      <Input 
                        type="email" 
                        name="email" 
                        placeholder="seu@email.com" 
                        value={formData.email} 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                        onPaste={(e) => e.preventDefault()}
                        className={cn("h-11 transition-all", getInputStyles(getInputState('email')))} 
                        disabled={loading || isSubmitting || !!successMessage} 
                      />
                    </div>
                    {errors.email && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1 leading-tight">{errors.email}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#2D5016]" /> Confirmar Email
                    </label>
                    <div className="relative">
                      <Input 
                        type="email" 
                        name="confirmarEmail" 
                        placeholder="Repita seu e-mail" 
                        value={formData.confirmarEmail} 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                        onPaste={(e) => e.preventDefault()}
                        className={cn("h-11 transition-all", getInputStyles(getInputState('confirmarEmail')))} 
                        disabled={loading || isSubmitting || !!successMessage} 
                      />
                    </div>
                    {errors.confirmarEmail && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1 leading-tight">{errors.confirmarEmail}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none flex items-center gap-2">📱 Telefone</label>
                  <div className="flex gap-2">
                    {tipoTelefone === TIPOS_TELEFONE.INTERNACIONAL && (
                      <div className="w-[140px]">
                        <Select value={ddiSelecionado} onValueChange={setDdiSelecionado} disabled={loading || isSubmitting || !!successMessage}>
                          <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="País" /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {DDIS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="relative flex-1">
                      <Input name="telefone" placeholder={tipoTelefone === TIPOS_TELEFONE.BR ? "(00) 00000-0000" : "Apenas números com DDD"} maxLength={15} required value={formData.telefone} onChange={handleChange} onBlur={handleBlur} className={cn("h-11 transition-all", getInputStyles(getInputState('telefone')))} disabled={loading || isSubmitting || !!successMessage} />
                    </div>
                  </div>
                  {tipoTelefone === TIPOS_TELEFONE.INTERNACIONAL && formData.telefone && !errors.telefone && (
                    <p className="text-[10px] text-slate-500 mt-1 text-right">Como será salvo: {getTelefoneExibivel(concatenarTelefoneInternacional(ddiSelecionado, formData.telefone), TIPOS_TELEFONE.INTERNACIONAL)}</p>
                  )}
                  {errors.telefone && <span className="text-[12px] text-red-500 mt-1">{errors.telefone}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#2D5016]" /> Senha
                    </label>
                    <div className="relative">
                      <Input type="password" name="senha" placeholder="••••••••" value={formData.senha} onChange={handleChange} onBlur={handleBlur} className={cn("h-11 transition-all", getInputStyles(getInputState('senha')))} disabled={loading || isSubmitting || !!successMessage} />
                    </div>
                    {errors.senha && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1 leading-tight">{errors.senha}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#2D5016]" /> Confirmar Senha
                    </label>
                    <div className="relative">
                      <Input type="password" name="confirmaSenha" placeholder="••••••••" value={formData.confirmaSenha} onChange={handleChange} onBlur={handleBlur} className={cn("h-11 transition-all", getInputStyles(getInputState('confirmaSenha')))} disabled={loading || isSubmitting || !!successMessage} />
                    </div>
                    {errors.confirmaSenha && <span className="text-[12px] text-red-500 flex items-center gap-1 mt-1">{errors.confirmaSenha}</span>}
                  </div>
                </div>

                <div className="flex items-start space-x-3 py-2">
                  <div className="flex items-center h-5">
                    <input id="terms" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-4 h-4 text-[#2D5016] border-gray-300 rounded focus:ring-[#2D5016]" disabled={loading || isSubmitting || !!successMessage} />
                  </div>
                  <div className="text-xs leading-tight">
                    <label htmlFor="terms" className="text-gray-600 font-medium">
                      Eu li e aceito a <Link to="/politica-privacidade" state={{ from: "/cadastro-visitante" }} className="text-[#2D5016] font-bold hover:underline flex inline-flex items-center gap-1">Política de Privacidade (LGPD) <ShieldCheck className="w-3 h-3" /></Link>
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className={cn("w-full h-12 text-lg font-medium transition-all", (loading || isSubmitting || !isFormValid || !!successMessage) ? "bg-gray-300 cursor-not-allowed text-gray-500 hover:bg-gray-300" : "bg-[#2D5016] hover:bg-[#1f3810] text-white cursor-pointer shadow-md hover:shadow-lg")} disabled={loading || isSubmitting || !isFormValid || !!successMessage}>
                    {loading || isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cadastrando...</> : successMessage ? "Cadastro Realizado!" : "CADASTRAR"}
                  </Button>
                </div>

                <div className="text-center mt-6 space-y-3">
                  <p className="text-sm text-gray-600">Já possui uma conta? <Link to="/login" className="text-[#2D5016] font-semibold hover:underline">Fazer login</Link></p>
                  <p className="text-sm text-gray-600 pt-3 border-t border-gray-100">Está com dificuldades? <a href="https://presidiomasculinolages.com/faq" target="_blank" rel="noopener noreferrer" className="text-[#2D5016] font-semibold hover:underline">Acesse nossa página de Ajuda (FAQ)</a></p>
                </div>

              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default CadastroVisitantePage;
