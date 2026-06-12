
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useVagas } from '@/hooks/useVagas';
import { createAgendamento } from '@/services/agendamentosService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const AgendamentoForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { vagas, loading, buscarVagas } = useVagas();

  const [tipo, setTipo] = useState('');
  const [galeria, setGaleria] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [formData, setFormData] = useState({
    nome_preso: '',
    matricula_preso: '',
    visitante1_nome: '',
    visitante1_carteirinha: '',
    visitante2_nome: '',
    visitante2_carteirinha: '',
    visitante3_nome: '',
    visitante3_carteirinha: '',
    whatsapp: '',
    email: ''
  });

  const handleBuscarVagas = async () => {
    if (!tipo || !galeria) {
      toast({ title: "Selecione tipo e galeria", variant: "destructive" });
      return;
    }

    try {
      await buscarVagas({ tipo, galeria });
    } catch (err) {
      toast({ title: "Erro ao buscar vagas", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Sessão inválida",
        description: "Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSlot) {
      toast({ title: "Selecione um horário disponível", variant: "destructive" });
      return;
    }

    try {
      const { verificarCarteirinhaStatus } = await import('@/services/agendamentosService');
      const status = await verificarCarteirinhaStatus(user.id);
      
      if (!status.ativa) {
        toast({ title: "Sua carteirinha não está ativa", variant: "destructive" });
        return;
      }

      if (status.validade && selectedSlot?.data_visita) {
        const dataVisita = new Date(`${selectedSlot.data_visita}T00:00:00`);
        // Extrai apenas YYYY-MM-DD do timestamp UTC para não sofrer conversão de fuso.
        const dataValidade = new Date((status.validade || '').substring(0, 10) + 'T00:00:00');
        dataValidade.setHours(0, 0, 0, 0);

        if (dataVisita > dataValidade) {
          toast({ 
            title: "Data posterior ao vencimento", 
            description: `Sua carteirinha vence em ${dataValidade.toLocaleDateString('pt-BR')}.`,
            variant: "destructive" 
          });
          return;
        }
      }

      await createAgendamento({
        vaga_configuracao_id: selectedSlot.id,
        id_visitante: user.id,
        ...formData,
        status: 'pendente'
      });

      toast({ title: "Agendamento solicitado com sucesso!" });

      // Reset
      setSelectedSlot(null);
      setTipo('');
      setGaleria('');
      setFormData({
        nome_preso: '',
        matricula_preso: '',
        visitante1_nome: '',
        visitante1_carteirinha: '',
        visitante2_nome: '',
        visitante2_carteirinha: '',
        visitante3_nome: '',
        visitante3_carteirinha: '',
        whatsapp: '',
        email: ''
      });

    } catch (err) {
      console.log("Erro completo da RPC:", err);

      const msg = err?.message || "";
      const detail = err?.details || "";
      const hint = err?.hint || "";

      // Handle specific blocking status exceptions thrown by DB trigger
      if (msg.includes('Agendamento indisponível:')) {
        const status = msg.split(':')[1]?.trim();
        let title = "Data Indisponível";
        let desc = "Esta data está bloqueada.";
        
        if (status === 'feriado') {
          desc = "Não há agendamentos nesta data por feriado";
        } else if (status === 'manutencao') {
          desc = "Data indisponível por manutenção do sistema";
        } else if (status === 'seguranca') {
          desc = "Data indisponível por motivo de segurança";
        } else if (status === 'fechado') {
          desc = "Data encerrada para novos agendamentos";
        }
        
        toast({
          title,
          description: desc,
          variant: "destructive"
        });
        return;
      }

      const erroIdentificado = 
        msg.includes('INTERNO_JA_TEM_AGENDAMENTO_NESTE_HORARIO') ||
        detail.includes('INTERNO_JA_TEM_AGENDAMENTO_NESTE_HORARIO') ||
        hint.includes('INTERNO_JA_TEM_AGENDAMENTO_NESTE_HORARIO');

      if (erroIdentificado) {
        toast({
          title: "Interno já possui agendamento",
          description: "Não é permitido criar dois agendamentos para o mesmo interno nesta vaga.",
          variant: "destructive"
        });
        return;
      }

      if (msg.includes('LIMITE_MENSAL_ATINGIDO')) {
        toast({
          title: "Limite Atingido",
          description: "Este interno já atingiu o limite de visitas para este mês.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Erro no Agendamento",
        description: msg || "Erro interno ao processar agendamento.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo Agendamento</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <select
            className="border p-2 rounded"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            <option value="">Tipo de Visita</option>
            <option value="social_presencial">Social Presencial</option>
            <option value="social_video">Videochamada</option>
            <option value="intima">Íntima</option>
          </select>

          <select
            className="border p-2 rounded"
            value={galeria}
            onChange={e => setGaleria(e.target.value)}
          >
            <option value="">Galeria</option>
            {['A','B','C','D','E','VIDEO'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <Button type="button" onClick={handleBuscarVagas}>
          Buscar Horários Disponíveis
        </Button>

        {loading && <p className="text-sm text-gray-500">Carregando horários...</p>}

        {vagas.length > 0 && (
          <div className="border rounded p-3 max-h-60 overflow-y-auto">
            {vagas.map(slot => (
              <div
                key={slot.id}
                className={`p-2 cursor-pointer rounded mb-2 border ${
                  selectedSlot?.id === slot.id
                    ? 'bg-green-200 border-green-400'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedSlot(slot)}
              >
                <strong>{slot.data_visita}</strong> - {slot.horario}
                <div className="text-sm text-gray-600">
                  Vagas restantes: {slot.vagas_restantes}
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          <Input
            placeholder="Nome do Interno"
            value={formData.nome_preso}
            onChange={e => setFormData({ ...formData, nome_preso: e.target.value })}
            required
          />

          <Input
            placeholder="Matrícula do Interno"
            value={formData.matricula_preso}
            onChange={e => setFormData({ ...formData, matricula_preso: e.target.value })}
            required
          />

          <Input
            placeholder="Visitante 1 - Nome"
            value={formData.visitante1_nome}
            onChange={e => setFormData({ ...formData, visitante1_nome: e.target.value })}
            required
          />

          <Input
            placeholder="Visitante 1 - Carteirinha"
            value={formData.visitante1_carteirinha}
            onChange={e => setFormData({ ...formData, visitante1_carteirinha: e.target.value })}
            required
          />

          <Input
            placeholder="Visitante 2 - Nome (Opcional)"
            value={formData.visitante2_nome}
            onChange={e => setFormData({ ...formData, visitante2_nome: e.target.value })}
          />

          <Input
            placeholder="Visitante 2 - Carteirinha (Opcional)"
            value={formData.visitante2_carteirinha}
            onChange={e => setFormData({ ...formData, visitante2_carteirinha: e.target.value })}
          />

          <Input
            placeholder="Visitante 3 - Nome (Opcional)"
            value={formData.visitante3_nome}
            onChange={e => setFormData({ ...formData, visitante3_nome: e.target.value })}
          />

          <Input
            placeholder="Visitante 3 - Carteirinha (Opcional)"
            value={formData.visitante3_carteirinha}
            onChange={e => setFormData({ ...formData, visitante3_carteirinha: e.target.value })}
          />

          <Input
            placeholder="WhatsApp"
            value={formData.whatsapp}
            onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
            required
          />

          <Input
            placeholder="Email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Button type="submit" className="w-full bg-[#2D5016]">
            Solicitar Agendamento
          </Button>

        </form>

      </CardContent>
    </Card>
  );
};

export default AgendamentoForm;
