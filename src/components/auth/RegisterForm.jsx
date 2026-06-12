import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const RegisterForm = () => {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Ref to prevent duplicate submissions
  const submitAttemptRef = useRef(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (submitAttemptRef.current || isSubmitting || loading) {
      console.log('Submission already in progress, ignoring duplicate');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    // Mark as submitting
    submitAttemptRef.current = true;
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        nome_completo: formData.nome_completo,
        cpf: formData.cpf,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento
      });

      if (result.success) {
        toast({ 
          title: "Sucesso!", 
          description: "Conta criada. Faça login para continuar.",
          className: "bg-green-600 text-white" 
        });
        
        // Navigate after short delay
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast({ 
          title: "Erro no cadastro", 
          description: result.error, 
          variant: "destructive" 
        });
        
        // Reset submission lock on error
        submitAttemptRef.current = false;
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast({ 
        title: "Erro no cadastro", 
        description: "Ocorreu um erro inesperado", 
        variant: "destructive" 
      });
      
      submitAttemptRef.current = false;
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nome Completo</label>
        <Input 
          name="nome_completo" 
          value={formData.nome_completo} 
          onChange={handleChange} 
          disabled={loading || isSubmitting}
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <Input 
          type="email" 
          name="email" 
          value={formData.email} 
          onChange={handleChange} 
          disabled={loading || isSubmitting}
          required 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">CPF</label>
          <Input 
            name="cpf" 
            value={formData.cpf} 
            onChange={handleChange} 
            disabled={loading || isSubmitting}
            required 
            placeholder="000.000.000-00" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Telefone</label>
          <Input 
            name="telefone" 
            value={formData.telefone} 
            onChange={handleChange} 
            disabled={loading || isSubmitting}
            placeholder="(00) 00000-0000" 
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
        <Input 
          type="date" 
          name="data_nascimento" 
          value={formData.data_nascimento} 
          onChange={handleChange} 
          disabled={loading || isSubmitting}
          required 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Senha</label>
          <div className="relative flex items-center">
            <Input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              disabled={loading || isSubmitting}
              className="pr-10"
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-gray-500 hover:text-[#2D5016] transition-colors focus:outline-none"
              disabled={loading || isSubmitting}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirmar Senha</label>
          <div className="relative flex items-center">
            <Input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              disabled={loading || isSubmitting}
              className="pr-10"
              required 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 text-gray-500 hover:text-[#2D5016] transition-colors focus:outline-none"
              disabled={loading || isSubmitting}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full bg-[#2D5016]" 
        disabled={loading || isSubmitting}
      >
        {loading || isSubmitting ? (
          <>
            <Loader2 className="animate-spin mr-2" /> Cadastrando...
          </>
        ) : (
          "Cadastrar"
        )}
      </Button>
    </form>
  );
};

export default RegisterForm;