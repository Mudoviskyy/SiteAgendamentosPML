
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const VagaForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    data: '',
    tipo: 'RD',
    vagas_totais: 1,
    ativa: true,
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ativa: true, // valor padrão
        ...initialData
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.data) {
      toast({ title: "Erro", description: "A data é obrigatória.", variant: "destructive" });
      return;
    }
    
    if (parseInt(formData.vagas_totais, 10) < 0) {
      toast({ title: "Erro", description: "A quantidade de vagas não pode ser negativa.", variant: "destructive" });
      return;
    }

    onSubmit({
      data: formData.data,
      tipo: formData.tipo,
      vagas_totais: parseInt(formData.vagas_totais, 10),
      ativa: formData.ativa !== false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Data</Label>
        <Input 
          type="date" 
          required 
          value={formData.data} 
          onChange={(e) => setFormData({...formData, data: e.target.value})} 
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de Turno</Label>
        <Select value={formData.tipo} onValueChange={(val) => setFormData({...formData, tipo: val})} disabled={loading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RD">RD - Plantão Diurno</SelectItem>
            <SelectItem value="RN">RN - Plantão Noturno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Capacidade de Vagas</Label>
        <Input 
          type="number" 
          min="0" 
          required 
          value={formData.vagas_totais} 
          onChange={(e) => setFormData({...formData, vagas_totais: e.target.value})} 
          disabled={loading}
        />
      </div>

      <div className="flex items-center space-x-2 pt-2 pb-1">
        <Checkbox 
          id="ativa" 
          checked={formData.ativa !== false} 
          onChange={(e) => setFormData({...formData, ativa: e.target.checked})}
          disabled={loading}
        />
        <Label htmlFor="ativa" className="cursor-pointer font-medium text-sm text-gray-700 select-none">
          Turno Ativo (servidores podem solicitar)
        </Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#2D5016] text-white hover:bg-[#1f3810]" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
};

export default VagaForm;

