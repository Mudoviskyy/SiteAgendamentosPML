import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { validateEmail } from '@/utils/validators';

const LoginForm = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setError('Por favor, insira um email válido.');
      return;
    }
    if (!formData.password) {
      setError('A senha é obrigatória.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: loginError } = await login(formData.email, formData.password);
      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else {
          setError(loginError.message || 'Ocorreu um erro ao fazer login.');
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            name="email"
            type="email"
            placeholder="seu@email.com"
            className="pl-9"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            name="password"
            type="password"
            placeholder="••••••••"
            className="pl-9"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#2D5016] hover:bg-[#1f3810] h-11 text-base transition-all"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...
          </>
        ) : (
          'Acessar Conta'
        )}
      </Button>
    </form>
  );
};

export default LoginForm;