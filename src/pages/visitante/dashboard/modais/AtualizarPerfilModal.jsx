import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';
import { validateNome, validarTelefone } from '@/utils/validators';
import { useToast } from '@/components/ui/use-toast';

const AtualizarPerfilModal = ({ isOpen, onClose, profile, onUpdate }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome_completo: '',
    telefone: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        nome_completo: profile.nome || '',
        telefone: profile.telefone || ''
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formValido = formData.nome_completo.trim().length > 5 && formData.telefone.length >= 6;

  const handleSave = async () => {
    const nomeValidation = validateNome(formData.nome_completo);
    const telefoneValidation = validarTelefone(formData.telefone, profile?.tipo_telefone);

    if (!nomeValidation.isValid || !telefoneValidation.isValid) {
      toast({ 
        title: "Dados inválidos", 
        description: nomeValidation.error || telefoneValidation.error, 
        variant: "destructive" 
      });
      return;
    }

    const telefoneLimpo = formData.telefone.replace(/\D/g, "");

    try {
      setIsUpdating(true);
      await onUpdate({ nome_completo: formData.nome_completo, telefone: telefoneLimpo });
      toast({ title: "Sucesso!", description: "Seus dados foram atualizados." });
      onClose();
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao atualizar dados.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white p-10 rounded-[24px] w-full max-w-md shadow-2xl border border-white/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#2D5016]/10 p-2.5 rounded-xl"><User className="w-5 h-5 text-[#2D5016]" /></div>
          <h2 className="text-xl font-bold text-slate-900 uppercase">Atualizar Perfil</h2>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <Input value={formData.nome_completo} onChange={handleChange} name="nome_completo" className="h-12 rounded-xl border-slate-200 px-4 bg-slate-50/50 text-gray-900" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone - DDD + Num (BR) ou DDI + Num (Internacional)</label>
            <Input value={formData.telefone} onChange={handleChange} placeholder="Apenas números" name="telefone" className="h-12 rounded-xl border-slate-200 px-4 bg-slate-50/50 text-gray-900" />
          </div>
        </div>
        <div className="flex flex-col gap-3 mt-10">
          <Button 
            disabled={!formValido || isUpdating} 
            className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white py-7 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg h-auto"
            onClick={handleSave}
          >
            {isUpdating ? "Salvando..." : "Gravar Alterações"}
          </Button>
          <Button variant="ghost" className="text-slate-400 font-bold uppercase text-[10px] tracking-widest h-12" onClick={onClose} disabled={isUpdating}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AtualizarPerfilModal;
