import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Loader2, Mail, Lock, ShieldCheck, Check, X, ClipboardList, Eye, EyeOff } from 'lucide-react';
import { 
  validateNome, validateSenha, validateConfirmaSenha, validateEmail as originalValidateEmail 
} from '@/utils/validators';

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
      return { isValid: false, error: 'Provedor não aceito. Use provedores conhecidos.' };
    }
  }
  return result;
};

const CadastroRemunerados = () => {
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    email: '',
    confirmar_email: '',
    senha: '',
    confirmar_senha: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    let vResult = { isValid: true, error: '' };

    if (name === 'matricula') {
      newValue = value.replace(/[^0-9]/g, '');
      if (newValue.length > 6) return;
    }

    const updatedFormData = { ...formData, [name]: newValue };
    setFormData(updatedFormData);

    switch(name) {
      case 'nome': vResult = validateNome(newValue); break;
      case 'email': vResult = validateEmail(newValue); break;
      case 'confirmar_email': 
        vResult = newValue === updatedFormData.email ? { isValid: true } : { isValid: false, error: 'Os e-mails não coincidem' };
        break;
      case 'senha': vResult = validateSenha(newValue); break;
      case 'confirmar_senha': vResult = validateConfirmaSenha(updatedFormData.senha, newValue); break;
      case 'matricula': 
        vResult = newValue.length === 6 ? { isValid: true } : { isValid: false, error: 'Matrícula deve ter 6 dígitos' };
        break;
      default: break;
    }

    setErrors(prev => ({ ...prev, [name]: vResult.isValid ? '' : vResult.error }));

    if (name === 'email' && updatedFormData.confirmar_email) {
      setErrors(prev => ({ ...prev, confirmar_email: newValue === updatedFormData.confirmar_email ? '' : 'Os e-mails não coincidem' }));
    }
    if (name === 'senha' && updatedFormData.confirmar_senha) {
      setErrors(prev => ({ ...prev, confirmar_senha: validateConfirmaSenha(newValue, updatedFormData.confirmar_senha).error }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleCadastro = async (e) => {
    e.preventDefault();

    const emailV = validateEmail(formData.email);
    if (!emailV.isValid) {
      toast({ title: "Erro no e-mail", description: emailV.error, variant: "destructive" });
      return;
    }

    if (formData.email !== formData.confirmar_email) {
      toast({ title: "Erro no e-mail", description: "O e-mail de confirmação não confere.", variant: "destructive" });
      return;
    }

    if (formData.senha !== formData.confirmar_senha) {
      toast({ title: "Erro nas senhas", description: "A confirmação de senha não confere.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome,
            matricula: formData.matricula,
            tipo_usuario: "servidor"
          }
        }
      });

      if (authError) throw authError;
      
      setSucesso(true);
      
      toast({
        title: "Quase lá!",
        description: "Enviamos um link de ativação para o seu e-mail.",
        className: "bg-[#2D5016] text-white"
      });
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar a conta.",
        variant: "destructive",
        });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = useMemo(() => {
    return (
      formData.nome && 
      formData.matricula.length === 6 &&
      formData.email &&
      formData.confirmar_email === formData.email &&
      formData.senha &&
      formData.confirmar_senha === formData.senha &&
      Object.values(errors).every(err => !err)
    );
  }, [formData, errors]);

  const getInputClass = (name) => {
    const base = "bg-zinc-800 border-zinc-700 text-white focus:ring-[#2D5016] transition-all";
    if (touched[name] && errors[name]) return `${base} border-red-500 ring-red-500`;
    if (touched[name] && !errors[name] && formData[name]) return `${base} border-green-500 ring-green-500`;
    return base;
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-zinc-950"
      style={{
        backgroundImage: `url('https://i.postimg.cc/8kq2ryHn/img-cadastro-remunerado.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <Helmet><title>Cadastro - Remunerados PML</title></Helmet>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 relative z-10"
      >
        {sucesso ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-[#2D5016]/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#84cc41]/20">
              <Mail className="w-10 h-10 text-[#84cc41]" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Verifique seu E-mail</h2>
            <p className="text-zinc-300 text-lg mb-8 leading-relaxed">
              Enviamos um link de ativação para <span className="text-white font-semibold">{formData.email}</span>.<br />
              <span className="text-[#84cc41] font-medium">Você precisa clicar no link para ativar sua conta antes de fazer login.</span>
            </p>
            <div className="space-y-4">
              <p className="text-zinc-500 text-sm italic">Não esqueça de conferir a pasta de Spam ou Lixo Eletrônico.</p>
              <Button 
                onClick={() => navigate('/remunerados/login')}
                className="bg-[#2D5016] hover:bg-[#1f3810] text-white px-8 py-6 text-lg rounded-xl transition-all"
              >
                Ir para o Login
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#2D5016]/30 rounded-full flex items-center justify-center mb-4 border border-[#84cc41]/20">
                <ShieldCheck className="w-8 h-8 text-[#84cc41]" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight text-center">Cadastro de Servidor</h2>
              <p className="text-zinc-400 text-sm mt-2 text-center font-medium">
                Preencha os dados corretamente para acessar o sistema.
              </p>
              
              {/* AVISO DE EMAIL */}
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3 max-w-md">
                <Mail className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-200 leading-tight">
                  <span className="font-bold text-blue-400">AVISO:</span> Após o cadastro, você receberá um link de ativação por e-mail. <span className="font-bold underline">A conta só será ativada após o clique no link.</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleCadastro} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1">Nome Completo</Label>
                  <Input 
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass('nome')}
                    placeholder="Nome e Sobrenome"
                  />
                  {touched.nome && errors.nome && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.nome}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1">Matrícula (6 dígitos)</Label>
                  <Input 
                    name="matricula"
                    required
                    type="text"
                    inputMode="numeric"
                    value={formData.matricula}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass('matricula')}
                    placeholder="Ex: 123456"
                  />
                  {touched.matricula && errors.matricula && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.matricula}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#84cc41]" /> Email Profissional
                  </Label>
                  <Input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass('email')}
                    placeholder="exemplo@email.com"
                  />
                  {touched.email && errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1 leading-tight">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#84cc41]" /> Confirmar Email
                  </Label>
                  <Input 
                    type="email" 
                    name="confirmar_email"
                    required
                    value={formData.confirmar_email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass('confirmar_email')}
                    placeholder="Repita seu e-mail"
                  />
                  {touched.confirmar_email && errors.confirmar_email && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.confirmar_email}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#84cc41]" /> Senha
                  </Label>
                  <div className="relative flex items-center">
                    <Input 
                      type={showSenha ? "text" : "password"} 
                      name="senha"
                      required
                      value={formData.senha}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`${getInputClass('senha')} pr-10`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.senha && errors.senha && <p className="text-red-500 text-[10px] mt-1 ml-1 leading-tight">{errors.senha}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 ml-1 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#84cc41]" /> Confirmar Senha
                  </Label>
                  <div className="relative flex items-center">
                    <Input 
                      type={showConfirmarSenha ? "text" : "password"} 
                      name="confirmar_senha"
                      required
                      value={formData.confirmar_senha}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`${getInputClass('confirmar_senha')} pr-10`}
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                      className="absolute right-3 text-zinc-400 hover:text-white transition-colors focus:outline-none"
                    >
                      {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.confirmar_senha && errors.confirmar_senha && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.confirmar_senha}</p>}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !isFormValid}
                className={`w-full font-bold h-12 text-lg mt-6 shadow-lg transition-all active:scale-[0.98] ${
                  isFormValid 
                    ? 'bg-[#2D5016] hover:bg-[#1f3810] text-white shadow-[#2D5016]/20' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                }`}
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-400 border-t border-zinc-800 pt-6">
              Já possui conta?{' '}
              <Link to="/remunerados/login" className="text-[#84cc41] hover:underline font-semibold transition-colors">
                Faça login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CadastroRemunerados;