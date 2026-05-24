import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Users, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as agendamentosService from '@/services/agendamentosService';
import { verificarCarteirinhaStatus } from '@/services/agendamentosService';
import { carteirinhasService } from '@/services/carteirinhasService';
import {
  getPrimaryDocumentLabel,
  getPrimaryDocumentValue,
  getPrimaryPhoneValue,
  shouldValidateAsCPF,
  isForeignProfile
} from '@/utils/profileIdentity';
import { TIPOS_TELEFONE } from '@/utils/identificacao';

const steps = [
  { id: 1, title: 'Tipo & Galeria' },
  { id: 2, title: 'Data' },
  { id: 3, title: 'Horário' },
  { id: 4, title: 'Dados do Interno' }
];

const AgendamentoModal = ({ onSuccess }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos em segundos
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selection Data
  const [options, setOptions] = useState({ tipos: [], galerias: [] });
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [carteirinhaValida, setCarteirinhaValida] = useState(null);
  const [verificandoCarteirinha, setVerificandoCarteirinha] = useState(true);
  const [meusPresos, setMeusPresos] = useState([]);
  const [meusMenores, setMeusMenores] = useState([]);
  const [menor2Selecionado, setMenor2Selecionado] = useState(false);
  const [menor3Selecionado, setMenor3Selecionado] = useState(false);
  const [bloqueioIntima, setBloqueioIntima] = useState(false);
  const [bloqueioComportamento, setBloqueioComportamento] = useState(false);
  const [verificandoIngresso, setVerificandoIngresso] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tipo_visita: '',
    galeria: '',
    data_visita: '',
    vaga_configuracao_id: '',
    horario: '',
    nome_preso: '',
    matricula_preso: '',
    visitante1_nome: '',
    visitante1_carteirinha: '',
    telefone: '',
    visitante2_nome: '',
    visitante2_carteirinha: '',
    visitante3_nome: '',
    visitante3_carteirinha: ''
  });

  useEffect(() => {
    if (profile?.nome_completo || user?.email || profile?.cpf) {
      setFormData(prev => ({
        ...prev,
        visitante1_nome: profile?.nome_completo || user?.email || '',
        visitante1_carteirinha: getPrimaryDocumentValue(profile),
        telefone: getPrimaryPhoneValue(profile)
      }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user?.id) return;

    const check = async () => {
      setVerificandoCarteirinha(true);
      try {
        const status = await verificarCarteirinhaStatus(user.id);
        setCarteirinhaValida(status.ativa);

        if (status.ativa) {
          // Busca todos os presos aprovados (mestre e vínculos)
          const { data: aprovados } = await supabase
            .from('carteirinhas')
            .select('id, nome_apenado, matricula_preso, menor_idade, nome_menor, protocolo')
            .eq('usuario_id', user.id)
            .eq('status', 'aprovado')
            .order('nome_apenado', { ascending: true });

          // Filtra para remover duplicados de matricula_preso (ex: quando há carteirinha de menor e mestre para o mesmo preso)
          // Prioriza a carteirinha que NÃO é de menor (mestre)
          const uniquePresos = Object.values((aprovados || []).reduce((acc, curr) => {
            const key = curr.matricula_preso || curr.id;
            if (!acc[key] || (!curr.menor_idade && acc[key].menor_idade)) {
              acc[key] = curr;
            }
            return acc;
          }, {}));

          setMeusPresos(uniquePresos.sort((a, b) => (a.nome_apenado || '').localeCompare(b.nome_apenado || '')));

          // Busca menores aprovados para uso como visitante 2/3
          const menores = (aprovados || []).filter(c => c.menor_idade && c.nome_menor);
          setMeusMenores(menores);
        }
      } catch (error) {
        console.error("Erro ao verificar carteirinha:", error);
        setCarteirinhaValida(false);
      } finally {
        setVerificandoCarteirinha(false);
      }
    };

    check();
  }, [user]);

  // Fetch initial options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        const data = await agendamentosService.getVagasConfiguracaoOptions();
        setOptions(data);
      } catch (error) {
        toast({ title: 'Erro', description: 'Falha ao carregar opções de agendamento.', className: "bg-red-500 text-white border-none" });
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, [toast]);

  // Fetch Dates when Type or Gallery changes
  useEffect(() => {
    if (formData.tipo_visita && formData.galeria && currentStep === 2) {
      const loadDates = async () => {
        setLoading(true);
        try {
          const dates = await agendamentosService.getAvailableDates(formData.tipo_visita, formData.galeria);
          setAvailableDates(dates);
        } catch (error) {
          console.error(error);
          toast({ title: 'Erro', description: 'Falha ao buscar datas disponíveis.', className: "bg-red-500 text-white border-none" });
        } finally {
          setLoading(false);
        }
      };
      loadDates();
    }
  }, [formData.tipo_visita, formData.galeria, currentStep, toast]);

  // Fetch Times when Date changes
  useEffect(() => {
    if (formData.data_visita && currentStep === 3) {
      const loadTimes = async () => {
        setLoading(true);
        try {
          const slots = await agendamentosService.getAvailableHorarios(
            formData.data_visita,
            formData.tipo_visita,
            formData.galeria
          );
          setAvailableSlots(slots);
        } catch (error) {
          console.error(error);
          toast({ title: 'Erro', description: 'Falha ao buscar horários.', className: "bg-red-500 text-white border-none" });
        } finally {
          setLoading(false);
        }
      };
      loadTimes();
    }
  }, [formData.data_visita, currentStep, formData.tipo_visita, formData.galeria, toast]);

  // Validar regra de 60 dias E comportamento para visita íntima
  useEffect(() => {
    const verificarIngresso = async () => {
      if (!formData.matricula_preso || !formData.data_visita || currentStep !== 4) {
        setBloqueioIntima(false);
        setBloqueioComportamento(false);
        return;
      }

      const tipo = formData.tipo_visita?.toLowerCase() || '';
      if (tipo === 'íntima' || tipo === 'intima') {
        setVerificandoIngresso(true);
        try {
          const { data, error } = await supabase
            .from('base_pdf')
            .select('data_ingresso, comportamento')
            .eq('matricula', formData.matricula_preso)
            .single();

          // --- Checagem de 60 dias ---
          if (data && data.data_ingresso) {
            const dataAgendada = new Date(formData.data_visita);
            const dataIngresso = new Date(data.data_ingresso);
            dataAgendada.setHours(0, 0, 0, 0);
            dataIngresso.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((dataAgendada - dataIngresso) / (1000 * 60 * 60 * 24));
            setBloqueioIntima(diffDays < 60);
          } else {
            setBloqueioIntima(false);
          }

          // --- Checagem de comportamento ---
          // null ou vazio = considerar BOM (não bloqueia)
          const comp = data?.comportamento;
          if (comp && comp.trim().toLowerCase() !== 'bom') {
            setBloqueioComportamento(true);
          } else {
            setBloqueioComportamento(false);
          }

        } catch (err) {
          console.error("Erro ao buscar dados do interno:", err);
          setBloqueioIntima(false);
          setBloqueioComportamento(false);
        } finally {
          setVerificandoIngresso(false);
        }
      } else {
        setBloqueioIntima(false);
        setBloqueioComportamento(false);
      }
    };

    verificarIngresso();
  }, [formData.matricula_preso, formData.data_visita, formData.tipo_visita, currentStep]);

  // Helper to format remaining time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle action when timer runs out
  const handleTimeout = () => {
    toast({
      title: "Tempo Limite Excedido",
      description: "O tempo de 5 minutos para concluir o agendamento expirou. O processo foi resetado.",
      className: "bg-red-500 text-white border-none shadow-lg font-bold",
      duration: 6000
    });
    navigate('/painel');
  };

  // Timer Effect
  useEffect(() => {
    if (carteirinhaValida !== true || verificandoCarteirinha) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [carteirinhaValida, verificandoCarteirinha]);

  const handleNext = () => {
    if (currentStep === 1 && (!formData.tipo_visita || !formData.galeria)) {
      toast({ title: "Atenção", description: "Selecione o tipo de visita e a galeria.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (currentStep === 2 && !formData.data_visita) {
      toast({ title: "Atenção", description: "Selecione uma data.", className: "bg-red-500 text-white border-none" });
      return;
    }
    if (currentStep === 3 && !formData.vaga_configuracao_id) {
      toast({ title: "Atenção", description: "Selecione um horário.", className: "bg-red-500 text-white border-none" });
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {

    setSubmitting(true);
    const status = await verificarCarteirinhaStatus(user.id);

    if (!status.ativa) {
      toast({
        title: "Carteirinha inválida",
        description: "Sua carteirinha não está ativa.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    if (status.validade && formData.data_visita) {
      const dataVisita = new Date(`${formData.data_visita}T00:00:00`);
      // Truncar a data de validade para comparar apenas a data (sem horas)
      const dataValidade = new Date(status.validade);
      dataValidade.setHours(0, 0, 0, 0);

      if (dataVisita > dataValidade) {
        toast({
          title: "Carteirinha vencida para esta data",
          description: `Sua carteirinha vence em ${dataValidade.toLocaleDateString('pt-BR')}. Não é possível agendar para datas posteriores ao vencimento.`,
          className: "bg-red-500 text-white border-none",
          duration: 6000
        });
        setSubmitting(false);
        return;
      }
    }

    if (!formData.nome_preso?.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Informe o nome do apenado.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    if (!formData.matricula_preso?.trim() || !/^\d{6}$/.test(formData.matricula_preso.trim())) {
      toast({
        title: "Matrícula Inválida ou Ausente",
        description: "A matrícula deve conter exatamente 6 números. AVISO: Se informada incorretamente, seu pedido será cancelado e você voltará ao final da fila.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    if (!formData.visitante1_nome?.trim()) {
      toast({
        title: "Campo Obrigatório",
        description: "Informe o nome completo do visitante principal.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    const cleanCpf1 = formData.visitante1_carteirinha.replace(/\D/g, '');

    if (shouldValidateAsCPF(profile)) {
      if (cleanCpf1.length !== 11) {
        toast({
          title: "CPF Inválido",
          description: "Seu CPF deve conter exatamente 11 números.",
          className: "bg-red-500 text-white border-none"
        });
        setSubmitting(false);
        return;
      }
    } else {
      if (cleanCpf1.length === 0) {
        toast({
          title: "Documento Inválido",
          description: "Informe um documento numérico válido.",
          className: "bg-red-500 text-white border-none"
        });
        setSubmitting(false);
        return;
      }
    }

    const cleanProntuario2 = formData.visitante2_carteirinha?.replace(/\D/g, '') || '';

    if (formData.visitante2_nome?.trim()) {
      if (cleanProntuario2.length < 4) {
        toast({
          title: "Prontuário inválido (Visitante 2)",
          description: "Informe um prontuário válido.",
          className: "bg-red-500 text-white border-none"
        });
        setSubmitting(false);
        return;
      }
    } else if (cleanProntuario2.length > 0) {
      toast({
        title: "Atenção (Visitante 2)",
        description: "Informe o nome do visitante 2 se fornecer um prontuário.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    const cleanProntuario3 = formData.visitante3_carteirinha?.replace(/\D/g, '') || '';

    if (formData.visitante3_nome?.trim()) {
      if (cleanProntuario3.length < 4) {
        toast({
          title: "Prontuário inválido (Visitante 3)",
          description: "Informe um prontuário válido.",
          className: "bg-red-500 text-white border-none"
        });
        setSubmitting(false);
        return;
      }
    } else if (cleanProntuario3.length > 0) {
      toast({
        title: "Atenção (Visitante 3)",
        description: "Informe o nome do visitante 3 se fornecer um prontuário.",
        className: "bg-red-500 text-white border-none"
      });
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        p_id_visitante: user.id,
        p_nome_preso: formData.nome_preso.trim(),
        p_matricula_preso: formData.matricula_preso.trim(),
        p_visitante1_nome: formData.visitante1_nome.trim(),
        p_visitante1_carteirinha: cleanCpf1 || 'PENDENTE',
        p_visitante2_nome: formData.visitante2_nome?.trim() || null,
        p_visitante2_carteirinha: cleanProntuario2 || null,
        p_visitante3_nome: formData.visitante3_nome?.trim() || null,
        p_visitante3_carteirinha: cleanProntuario3 || null,
        p_whatsapp: profile?.telefone || '',
        p_email: user.email,
        p_vaga_configuracao_id: formData.vaga_configuracao_id
      };

      // 💾 PERSISTÊNCIA DA MATRÍCULA NO CADASTRO MASTER
      // Se a carteirinha selecionada não possuía matrícula, salvamos agora para os próximos agendamentos
      const presoCard = meusPresos.find(p => p.id === formData.carteirinha_id);
      if (presoCard && !presoCard.matricula_preso) {
        try {
          await carteirinhasService.updateMatricula(presoCard.id, formData.matricula_preso.trim());
          toast({
            title: "Cadastro Atualizado",
            description: "A matrícula foi salva em sua carteirinha para os próximos agendamentos.",
            className: "bg-[#2D5016] text-white border-none mb-2"
          });
        } catch (updateError) {
          console.error("Erro ao atualizar matrícula da carteirinha:", updateError);
          // Não bloqueamos o agendamento se for apenas um erro de atualização de cadastro, 
          // a menos que seja um erro crítico, mas o log ajudará no debug.
        }
      }

      const response = await agendamentosService.criarAgendamento(payload);

      // Tratamento de respostas vindas do serviço (RPC)
      if (response.erro) {
        toast({ title: "Erro no Agendamento", description: response.erro, className: "bg-red-500 text-white border-none" });
      } else if (response.fila) {
        // Caso a vaga tenha sido preenchida enquanto o usuário preenchia o formulário
        toast({
          title: "Vaga Esgotada",
          description: "Desculpe, este horário acabou de ser totalmente preenchido. Por favor, escolha outra opção.",
          className: "bg-amber-600 text-white border-none shadow-lg"
        });
        setCurrentStep(3); // Volta para seleção de horário
      } else if (response.sucesso) {
        toast({
          title: "Sucesso!",
          description: "Seu agendamento foi realizado com sucesso.",
          className: "bg-[#2D5016] text-white border-none"
        });
        if (onSuccess) onSuccess();
      } else {
        // Fallback genérico para evitar o "pisca" sem feedback
        toast({
          title: "Aviso",
          description: "Não foi possível confirmar o agendamento no momento. Verifique a disponibilidade.",
          className: "bg-gray-700 text-white border-none"
        });
      }
    } catch (error) {
      console.error("Erro capturado:", error);

      // 🟢 TRATAMENTO DO ERRO DE DUPLICIDADE (23505)
      if (error.code === '23505' || error.message?.includes('23505')) {
        toast({
          title: "Agendamento Duplicado",
          description: "Este interno já possui um agendamento marcado para este mesmo dia e horário. Verifique os dados ou escolha outro horário.",
          className: "bg-amber-600 text-white border-none shadow-lg",
          duration: 6000,
        });
      } else {
        // Erro genérico para outros problemas
        toast({
          title: "Erro",
          description: error.message || "Ocorreu um erro ao processar sua solicitação.",
          className: "bg-red-500 text-white border-none"
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getLocalDate = (dateString) => {
    return new Date(dateString + 'T00:00:00');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header / Progress */}
      <div className="bg-gray-50 border-b border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Nova Solicitação de Visita</h2>
          {carteirinhaValida === true && !verificandoCarteirinha && (
            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold shadow-sm transition-all
              ${timeLeft <= 60
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                : 'bg-[#2D5016]/10 text-[#2D5016] border-[#2D5016]/20'
              }`}
            >
              <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-red-600' : 'text-[#2D5016]'}`} />
              <span>Tempo restante: {formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-0"></div>
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center justify-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep >= step.id ? 'bg-[#2D5016] text-white shadow-md' : 'bg-white border-2 border-gray-300 text-gray-400'}`}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className={`text-xs mt-2 font-medium ${currentStep >= step.id ? 'text-[#2D5016]' : 'text-gray-400'}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-800 font-bold uppercase text-sm">Atenção às Faltas</h4>
            <p className="text-amber-700 text-sm mt-1">
              O não comparecimento às visitas agendadas tira a vaga de outro familiar. Evite de não ir no dia da visita.
            </p>
          </div>
        </div>

        {verificandoCarteirinha && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" />
          </div>
        )}

        {carteirinhaValida === false && !verificandoCarteirinha && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Carteirinha não ativa
            </h3>
            <p className="text-gray-600 max-w-md">
              Você precisa de uma carteirinha ativa para realizar um agendamento.
            </p>
          </div>
        )}

        {carteirinhaValida && (
          <AnimatePresence mode="wait">
            {/* STEP 1: Tipo & Galeria */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Tipo de Visita</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {options.tipos.map(type => (
                      <div
                        key={type}
                        onClick={() => setFormData(prev => ({ ...prev, tipo_visita: type }))}
                        className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:border-[#2D5016] hover:bg-green-50 ${formData.tipo_visita === type ? 'border-[#2D5016] bg-green-50 shadow-md' : 'border-gray-200'}`}
                      >
                        <Users className={`w-8 h-8 ${formData.tipo_visita === type ? 'text-[#2D5016]' : 'text-gray-400'}`} />
                        <span className="font-medium capitalize text-center">{type.replace('_', ' ')}</span>
                      </div>
                    ))}
                    {options.tipos.length === 0 && !loading && <p className="text-gray-500">Nenhum tipo disponível</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Galeria</Label>
                  <div className="flex flex-wrap gap-3">
                    {options.galerias.map(gal => (
                      <Button
                        key={gal}
                        variant={formData.galeria === gal ? "default" : "outline"}
                        onClick={() => setFormData(prev => ({ ...prev, galeria: gal }))}
                        className={`w-16 h-16 rounded-full text-xl ${formData.galeria === gal ? 'bg-[#2D5016] hover:bg-[#1f3810] text-white' : ''}`}
                      >
                        {gal}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Data */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> Datas Disponíveis
                </h3>

                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-[#2D5016]" /></div>
                ) : availableDates.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {availableDates.map(date => (
                      <div
                        key={date}
                        onClick={() => setFormData(prev => ({ ...prev, data_visita: date }))}
                        className={`cursor-pointer border rounded-xl p-4 text-center transition-all hover:shadow-md ${formData.data_visita === date ? 'border-[#2D5016] bg-green-50 ring-2 ring-[#2D5016] ring-offset-2' : 'border-gray-200'}`}
                      >
                        <p className="text-sm text-gray-500 uppercase">{getLocalDate(date).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                        <p className="text-lg font-bold text-gray-900">{getLocalDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Não há datas disponíveis para esta seleção.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Horário */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Horários Disponíveis
                </h3>

                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-[#2D5016]" /></div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSlots.map(slot => (
                      <div
                        key={slot.id}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          vaga_configuracao_id: slot.id,
                          horario: slot.horario
                        }))}
                        className={`relative border rounded-lg p-4 flex justify-between items-center transition-all cursor-pointer hover:border-[#2D5016]
                          ${formData.vaga_configuracao_id === slot.id ? 'border-[#2D5016] bg-green-50 ring-1 ring-[#2D5016]' : 'border-gray-200'}`}
                      >
                        <div>
                          <p className="font-bold text-lg">{slot.horario.slice(0, 5)}</p>
                          <p className="text-xs text-gray-500">
                            {slot.vagas_totais - slot.vagas_ocupadas} vagas restantes
                          </p>
                        </div>

                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Disponível
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">Nenhum horário encontrado.</div>
                )}
              </motion.div>
            )}

            {/* STEP 4: Dados do Detento */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-bold text-yellow-800 mb-1">Resumo do Agendamento</h4>
                  <div className="text-sm text-yellow-700 grid grid-cols-2 gap-2">
                    <p><strong>Tipo:</strong> {formData.tipo_visita}</p>
                    <p><strong>Galeria:</strong> {formData.galeria}</p>
                    <p><strong>Data:</strong> {getLocalDate(formData.data_visita).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Horário:</strong> {formData.horario}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {bloqueioIntima && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm mb-4"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-800 font-bold uppercase text-sm">Agendamento Bloqueado</h4>
                        <p className="text-red-700 text-sm mt-1">
                          Este detento tem data de ingresso na unidade com menos de 60 dias da data agendada para a íntima. Mais informações no Setor Social via Whatsapp.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {bloqueioComportamento && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm mb-4"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-800 font-bold uppercase text-sm">Agendamento Bloqueado</h4>
                        <p className="text-red-700 text-sm mt-1">
                          Este detento não está com o comportamento BOM, ele não pode ter visitas íntimas até que esse status mude. Mais informações no Setor Social via Whatsapp.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seletor_preso">Selecione o Interno que irá visitar *</Label>
                      <div className="relative">
                        <Select
                          onValueChange={(val) => {
                            const preso = meusPresos.find(p => p.id === val);
                            if (preso) {
                              setFormData(prev => ({
                                ...prev,
                                carteirinha_id: preso.id, // Armazenamos o ID da carteirinha selecionada
                                nome_preso: preso.nome_apenado,
                                matricula_preso: preso.matricula_preso || ''
                              }));
                            }
                          }}
                          value={formData.carteirinha_id}
                        >
                          <SelectTrigger className="w-full border-gray-300 focus:border-[#2D5016] focus:ring-[#2D5016] text-gray-900 bg-white">
                            <SelectValue placeholder="Escolha um interno..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {meusPresos.map((preso) => (
                              <SelectItem key={preso.id} value={preso.id}>
                                {preso.nome_apenado} {preso.matricula_preso ? `(${preso.matricula_preso})` : '(PENDENTE REGISTRO)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {verificandoIngresso && (
                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>

                      {!meusPresos.find(p => p.id === formData.carteirinha_id)?.matricula_preso && formData.carteirinha_id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3"
                        >
                          <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4" /> ATENÇÃO: Matrícula Faltante
                          </div>
                          <p className="text-[11px] text-red-700 leading-relaxed">
                            Este interno ainda não possui matrícula em nosso sistema. Por favor, informe os **6 dígitos** corretamente.
                            <br />
                            <strong className="underline">AVISO:</strong> Se a matrícula for informada incorretamente, seu agendamento será **CANCELADO** e você retornará para o final da fila de espera.
                          </p>
                          <div className="space-y-1">
                            <Label htmlFor="manual_matricula" className="text-[10px] font-black text-red-900 uppercase">Confirmar Matrícula do Interno *</Label>
                            <Input
                              id="manual_matricula"
                              placeholder="Digite a matrícula (apenas números)"
                              value={formData.matricula_preso}
                              onChange={(e) => setFormData({ ...formData, matricula_preso: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                              className="border-red-200 focus:border-red-500 focus:ring-red-500 bg-white text-red-900 font-bold"
                              required
                            />
                          </div>
                        </motion.div>
                      )}
                      <p className="text-[10px] text-gray-500 italic">
                        Não encontrou o detento? Adicione um novo vínculo no seu Dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visitante1_nome">Seu Nome Completo (Visitante Principal) *</Label>
                      <Input
                        id="visitante1_nome"
                        placeholder="Nome completo do visitante"
                        value={formData.visitante1_nome}
                        readOnly
                        className="border-gray-300 bg-gray-100 cursor-not-allowed text-gray-900"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitante1_carteirinha">{getPrimaryDocumentLabel(profile)} *</Label>
                      <Input
                        id="visitante1_carteirinha"
                        placeholder={isForeignProfile(profile) ? "Apenas números" : "000.000.000-00"}
                        value={formData.visitante1_carteirinha}
                        readOnly={!!getPrimaryDocumentValue(profile)}
                        onChange={(e) => setFormData({ ...formData, visitante1_carteirinha: e.target.value })}
                        className={`border-gray-300 focus:border-[#2D5016] focus:ring-[#2D5016] text-gray-900 ${getPrimaryDocumentValue(profile) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="telefone">Telefone de Contato</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      readOnly
                      className="border-gray-300 bg-gray-100 cursor-not-allowed text-gray-900"
                    />
                    <p className="text-xs text-gray-500">
                      Este é o telefone vinculado ao seu cadastro.
                    </p>
                    {profile?.tipo_telefone === TIPOS_TELEFONE.INTERNACIONAL && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">Telefone internacional vinculado ao seu cadastro.</p>
                    )}
                  </div>

                  {formData.tipo_visita?.toUpperCase() !== 'ÍNTIMA' && formData.tipo_visita?.toUpperCase() !== 'INTIMA' && (
                    <div className="pt-4 border-t border-gray-100">
                      <Label className="mb-4 block text-gray-500">Visitantes Adicionais (Opcional)</Label>

                      {/* VISITANTE 2 */}
                      <div className="mb-4 space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Visitante 2</p>

                        {/* Dropdown menor para Visitante 2 */}
                        {(() => {
                          const menoresFiltrados = meusMenores.filter(m =>
                            m.matricula_preso && formData.matricula_preso &&
                            m.matricula_preso === formData.matricula_preso
                          );
                          return menoresFiltrados.length > 0 && !menor2Selecionado && (
                            <div className="p-3 bg-pink-50 rounded-lg border border-pink-200 mb-2">
                              <Label className="text-[10px] font-bold text-pink-800 uppercase mb-1.5 block">
                                Selecionar menor vinculado a {formData.nome_preso || 'este interno'}
                              </Label>
                              <Select
                                onValueChange={(val) => {
                                  const menor = menoresFiltrados.find(m => m.id === val);
                                  if (!menor) return;
                                  const numCarteirinha = (menor.protocolo || '').replace(/\D/g, '').slice(0, 6);
                                  setFormData(prev => ({ ...prev, visitante2_nome: menor.nome_menor, visitante2_carteirinha: numCarteirinha }));
                                  setMenor2Selecionado(true);
                                }}
                              >
                                <SelectTrigger className="w-full border-pink-200 bg-white text-gray-900">
                                  <SelectValue placeholder="Selecione um menor..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {menoresFiltrados.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.nome_menor} <span className="text-pink-600 text-[10px] font-bold">(MENOR)</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            placeholder="Nome do Visitante 2"
                            value={formData.visitante2_nome}
                            readOnly={menor2Selecionado}
                            onChange={(e) => !menor2Selecionado && setFormData({
                              ...formData, visitante2_nome: e.target.value
                            })}
                            className={`text-gray-900 border-gray-300 ${menor2Selecionado ? 'bg-gray-100 cursor-not-allowed' : 'bg-white focus:border-[#2D5016] focus:ring-[#2D5016]'}`}
                          />
                          <Input
                            type="text"
                            placeholder="PRONTUÁRIO do Visitante 2 (Ex: 112233)"
                            inputMode="numeric"
                            maxLength={6}
                            value={formData.visitante2_carteirinha}
                            readOnly={menor2Selecionado}
                            onChange={(e) => {
                              if (menor2Selecionado) return;
                              const somenteNumeros = e.target.value.replace(/\D/g, '');
                              setFormData(prev => ({
                                ...prev,
                                visitante2_carteirinha: somenteNumeros
                              }));
                            }}
                            className={`text-gray-900 border-gray-300 ${menor2Selecionado ? 'bg-gray-100 cursor-not-allowed' : 'bg-white focus:border-[#2D5016] focus:ring-[#2D5016]'}`}
                          />
                        </div>
                        {menor2Selecionado && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenor2Selecionado(false);
                              setFormData(prev => ({ ...prev, visitante2_nome: '', visitante2_carteirinha: '' }));
                            }}
                            className="text-[11px] text-pink-700 underline hover:text-pink-900 transition-colors mt-1"
                          >
                            ✕ Limpar Visitante 2
                          </button>
                        )}
                      </div>

                      {/* VISITANTE 3 */}
                      <div className="mb-2 space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Visitante 3</p>

                        {/* Dropdown menor para Visitante 3 */}
                        {(() => {
                          const menoresFiltrados = meusMenores.filter(m =>
                            m.matricula_preso && formData.matricula_preso &&
                            m.matricula_preso === formData.matricula_preso
                          );
                          return menoresFiltrados.length > 0 && !menor3Selecionado && (
                            <div className="p-3 bg-pink-50 rounded-lg border border-pink-200 mb-2">
                              <Label className="text-[10px] font-bold text-pink-800 uppercase mb-1.5 block">
                                Selecionar menor vinculado a {formData.nome_preso || 'este interno'}
                              </Label>
                              <Select
                                onValueChange={(val) => {
                                  const menor = menoresFiltrados.find(m => m.id === val);
                                  if (!menor) return;
                                  const numCarteirinha = (menor.protocolo || '').replace(/\D/g, '').slice(0, 6);
                                  setFormData(prev => ({ ...prev, visitante3_nome: menor.nome_menor, visitante3_carteirinha: numCarteirinha }));
                                  setMenor3Selecionado(true);
                                }}
                              >
                                <SelectTrigger className="w-full border-pink-200 bg-white text-gray-900">
                                  <SelectValue placeholder="Selecione um menor..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {menoresFiltrados.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.nome_menor} <span className="text-pink-600 text-[10px] font-bold">(MENOR)</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            placeholder="Nome do Visitante 3"
                            value={formData.visitante3_nome}
                            readOnly={menor3Selecionado}
                            onChange={(e) => {
                              if (menor3Selecionado) return;
                              setFormData(prev => ({
                                ...prev,
                                visitante3_nome: e.target.value
                              }));
                            }}
                            className={`text-gray-900 border-gray-300 ${menor3Selecionado ? 'bg-gray-100 cursor-not-allowed' : 'bg-white focus:border-[#2D5016] focus:ring-[#2D5016]'}`}
                          />
                          <Input
                            type="text"
                            placeholder="PRONTUÁRIO do Visitante 3 (Ex: 112233)"
                            inputMode="numeric"
                            maxLength={6}
                            value={formData.visitante3_carteirinha}
                            readOnly={menor3Selecionado}
                            onChange={(e) => {
                              if (menor3Selecionado) return;
                              const somenteNumeros = e.target.value.replace(/\D/g, '');
                              setFormData(prev => ({
                                ...prev,
                                visitante3_carteirinha: somenteNumeros
                              }));
                            }}
                            className={`text-gray-900 border-gray-300 ${menor3Selecionado ? 'bg-gray-100 cursor-not-allowed' : 'bg-white focus:border-[#2D5016] focus:ring-[#2D5016]'}`}
                          />
                        </div>
                        {menor3Selecionado && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenor3Selecionado(false);
                              setFormData(prev => ({ ...prev, visitante3_nome: '', visitante3_carteirinha: '' }));
                            }}
                            className="text-[11px] text-pink-700 underline hover:text-pink-900 transition-colors mt-1"
                          >
                            ✕ Limpar Visitante 3
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2 italic">
                        {meusMenores.filter(m => m.matricula_preso && formData.matricula_preso && m.matricula_preso === formData.matricula_preso).length === 0
                          ? 'Nenhum menor vinculado a este interno. Solicite uma carteirinha de menor no seu painel.'
                          : 'Selecione menores pelo dropdown rosa acima de cada visitante ou preencha manualmente.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack} disabled={submitting}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        ) : (
          <div /> // Spacer
        )}

        {currentStep < 4 ? (
          <Button onClick={handleNext} className="bg-[#2D5016] hover:bg-[#1f3810] text-white" disabled={loading}>
            Próximo <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="bg-[#2D5016] hover:bg-[#1f3810] text-white min-w-[140px]"
            disabled={!carteirinhaValida || verificandoCarteirinha || submitting || verificandoIngresso || bloqueioIntima || bloqueioComportamento}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmar
          </Button>
        )}
      </div>
    </div>
  );
};

export default AgendamentoModal;