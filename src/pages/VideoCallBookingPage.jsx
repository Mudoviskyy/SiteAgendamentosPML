/*import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { useCPFMask, validateCPF } from '../hooks/useCPFMask';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { useVisitorManagement } from '../context/VisitorManagementContext';
import { Link } from 'react-router-dom';

const VideoCallBookingPage = () => {
  const cpf = useCPFMask();
  const { getVisitorByCPF } = useVisitorManagement(); // UPDATE TASK 8
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gallery: '',
    visitDate: '',
    visitTime: '',
    email: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const { toast } = useToast();

  const galleries = ['A', 'B', 'C', 'D'];
  const availableTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const getVisitCount = (cpfNumber, month) => {
    const visits = JSON.parse(localStorage.getItem('visits') || '{}');
    if (!visits[cpfNumber]) return 0;
    
    const monthVisits = visits[cpfNumber].filter(v => 
      (v.type === 'video' || v.type === 'inperson') && v.month === month
    );
    return monthVisits.length;
  };

  const saveVisit = (cpfNumber, visitData) => {
    const visits = JSON.parse(localStorage.getItem('visits') || '{}');
    if (!visits[cpfNumber]) visits[cpfNumber] = [];
    
    visits[cpfNumber].push(visitData);
    localStorage.setItem('visits', JSON.stringify(visits));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations
    if (!cpf.isValid()) {
      toast({
        title: "CPF Inválido",
        description: "Por favor, insira um CPF válido com 11 dígitos.",
        variant: "destructive"
      });
      return;
    }

    if (!validateCPF(cpf.value)) {
      toast({
        title: "CPF Inválido",
        description: "O CPF informado não é válido.",
        variant: "destructive"
      });
      return;
    }

    // --- VISITOR VALIDATION START (TASK 8) ---
    const visitor = getVisitorByCPF(cpf.value);
    
    if (!visitor) {
      toast({
        title: "CPF Não Encontrado",
        description: (
          <div className="flex flex-col gap-2">
            <span>CPF não cadastrado em nossa base.</span>
            <Link to="/cadastro-visitante" className="underline font-bold text-[#2D5016]">
              Clique aqui para fazer seu cadastro primeiro.
            </Link>
          </div>
        ),
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    if (visitor.status === 'PENDENTE') {
      toast({
        title: "Cadastro Pendente",
        description: "Seu cadastro está pendente de aprovação. Aguarde email de confirmação.",
        variant: "destructive"
      });
      return;
    }

    if (visitor.status === 'INATIVO') {
      toast({
        title: "Cadastro Inativo",
        description: "Seu cadastro foi desativado. Entre em contato com a administração.",
        variant: "destructive"
      });
      return;
    }
    // --- VISITOR VALIDATION END ---

    if (!formData.dateOfBirth || !formData.gallery || !formData.visitDate || !formData.visitTime || !formData.email) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    // Check visit limit
    const visitMonth = formData.visitDate.substring(0, 7);
    const visitCount = getVisitCount(cpf.getRawValue(), visitMonth);
    
    if (visitCount >= 3) {
      toast({
        title: "Limite Excedido",
        description: "Você já atingiu o limite de 3 visitas sociais neste mês.",
        variant: "destructive"
      });
      return;
    }

    // Save visit
    const visitData = {
      type: 'video',
      date: formData.visitDate,
      time: formData.visitTime,
      gallery: formData.gallery,
      month: visitMonth,
      timestamp: new Date().toISOString()
    };
    
    saveVisit(cpf.getRawValue(), visitData);

    // Generate receipt
    const receiptData = {
      protocol: `VID${Date.now()}`,
      cpf: cpf.value,
      gallery: formData.gallery,
      date: new Date(formData.visitDate).toLocaleDateString('pt-BR'),
      time: formData.visitTime,
      email: formData.email,
      generatedAt: new Date().toLocaleString('pt-BR')
    };

    setReceipt(receiptData);
    setShowSuccess(true);

    toast({
      title: "Agendamento Realizado!",
      description: "Você receberá uma confirmação por email.",
    });
  };

  if (showSuccess && receipt) {
    return (
      <>
        <Helmet>
          <title>Agendamento Confirmado - Presídio Masculino de Lages</title>
          <meta name="description" content="Seu agendamento de videochamada foi confirmado com sucesso." />
        </Helmet>

        <div className="min-h-screen bg-gray-50 py-16">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-[#2D5016] border-2">
                <CardHeader className="text-center bg-[#2D5016] text-white">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                  <CardTitle className="text-2xl">Agendamento Confirmado!</CardTitle>
                  <CardDescription className="text-gray-200">
                    Seu agendamento de videochamada foi realizado com sucesso
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md space-y-3">
                    <p className="font-semibold text-lg">Comprovante de Agendamento</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Protocolo:</span> {receipt.protocol}</p>
                      <p><span className="font-medium">CPF:</span> {receipt.cpf}</p>
                      <p><span className="font-medium">Galeria:</span> {receipt.gallery}</p>
                      <p><span className="font-medium">Data:</span> {receipt.date}</p>
                      <p><span className="font-medium">Horário:</span> {receipt.time}</p>
                      <p><span className="font-medium">Email:</span> {receipt.email}</p>
                      <p className="text-gray-500 text-xs mt-3">Gerado em: {receipt.generatedAt}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                    <p className="text-sm text-blue-800">
                      ✉️ Uma confirmação foi enviada para o email cadastrado. Por favor, verifique sua caixa de entrada e spam.
                    </p>
                  </div>

                  <Button 
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white"
                  >
                    Voltar para Início
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Agendamento de Videochamada - Presídio Masculino de Lages</title>
        <meta name="description" content="Agende sua visita por videochamada ao Presídio Masculino de Lages. Sábados e domingos, 20 minutos de duração." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-lg overflow-hidden shadow-lg"
          >
            <img 
              src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/f062cb45f2163f9bc786d52abffa3a5d.png"
              alt="Videochamada - sistema de visitas virtuais"
              className="w-full h-64 object-cover"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#2D5016]" />
                    Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#2D5016]" />
                      Dias Disponíveis
                    </p>
                    <p className="text-sm text-gray-600">Sábados e Domingos</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#2D5016]" />
                      Duração
                    </p>
                    <p className="text-sm text-gray-600">20 minutos</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Limite: 3 visitas sociais por mês (contando videochamada + presencial)
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                    <p className="text-xs text-blue-800">
                      ℹ️ O CPF deve estar previamente cadastrado no sistema
                    </p>
                  </div>

                  <img 
                    src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/381c49c4a8f3cc7f10de51317.png"
                    alt="Instruções de agendamento de visitas"
                    className="w-full rounded-md mt-4"
                  />
                </CardContent>
              </Card>
            </div>

            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Agendar Videochamada</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo para agendar sua visita por videochamada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CPF *
                        </label>
                        <Input
                          value={cpf.value}
                          onChange={cpf.handleChange}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Nascimento *
                        </label>
                        <Input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Galeria *
                        </label>
                        <select
                          value={formData.gallery}
                          onChange={(e) => setFormData({...formData, gallery: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                          required
                        >
                          <option value="">Selecione...</option>
                          {galleries.map(g => (
                            <option key={g} value={g}>Galeria {g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data da Visita *
                        </label>
                        <Input
                          type="date"
                          value={formData.visitDate}
                          onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Horário *
                        </label>
                        <select
                          value={formData.visitTime}
                          onChange={(e) => setFormData({...formData, visitTime: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                          required
                        >
                          <option value="">Selecione...</option>
                          {availableTimes.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email para Confirmação *
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="seu@email.com"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white h-12 text-lg"
                    >
                      Confirmar Agendamento
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoCallBookingPage;*/