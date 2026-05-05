import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    empresa: '' // honeypot anti bot
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  // Validação de e-mail em tempo real para feedback visual
  const isEmailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return formData.email.length === 0 || emailRegex.test(formData.email);
  }, [formData.email]);

  // Mascara dinâmica de telefone
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    
    setFormData({ ...formData, phone: value });
  };

  const CONTACT_COOLDOWN = 48 * 60 * 60 * 1000; // 48h

  const handleSubmit = async (e) => {
    e.preventDefault();

    // honeypot anti-bot
    if (formData.empresa) return;

    // bloqueio local (navegador)
    const lastSubmit = localStorage.getItem("lastContactSubmit");

    if (lastSubmit) {
      const diff = Date.now() - Number(lastSubmit);

      if (diff < CONTACT_COOLDOWN) {

        const timeLeft = CONTACT_COOLDOWN - diff;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        toast({
          title: "Envio recente detectado",
          description: `Você já enviou uma mensagem. Tente novamente em ${hoursLeft}h ${minutesLeft}min.`,
          className: "bg-red-600 text-white border-none shadow-2xl font-medium",
          variant: "destructive"
        });

        return;
      }
    }

    // sanitização
    const cleanData = {
      nome: formData.name.replace(/\s+/g, ' ').trim(),
      email: formData.email.trim().toLowerCase(),
      telefone: formData.phone.replace(/\D/g, ''),
      assunto: formData.subject.replace(/\s+/g, ' ').trim(),
      mensagem: formData.message.replace(/\s+/g, ' ').trim()
    };

    // validação obrigatória
    if (!cleanData.nome || !cleanData.email || !cleanData.assunto || !cleanData.mensagem) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos necessários.",
        className: "bg-red-600 text-white border-none shadow-2xl font-medium",
        variant: "destructive"
      });
      return;
    }

    // validação email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(cleanData.email)) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido.",
        className: "bg-red-600 text-white border-none shadow-2xl font-medium",
        variant: "destructive"
      });
      return;
    }

    // validação telefone
    if (cleanData.telefone && cleanData.telefone.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone completo com DDD.",
        className: "bg-red-600 text-white border-none shadow-2xl font-medium",
        variant: "destructive"
      });
      return;
    }

    // mensagem mínima
    if (cleanData.mensagem.length < 20) {
      toast({
        title: "Mensagem muito curta",
        description: "Escreva uma mensagem com pelo menos 20 caracteres.",
        className: "bg-red-600 text-white border-none shadow-2xl font-medium",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {

      // consulta edge function para validar IP/email
      const rateCheck = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-rate-limit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email: cleanData.email
          })
        }
      );

      const rateData = await rateCheck.json();

      if (!rateData.allowed) {

        toast({
          title: "Limite de envio atingido",
          description: "Já recebemos uma mensagem recentemente deste email ou rede. Tente novamente amanhã.",
          className: "bg-red-600 text-white border-none shadow-2xl font-medium",
          variant: "destructive"
        });

        setIsSubmitting(false);
        return;
      }

      // envio para Formspree
      const response = await fetch("https://formspree.io/f/xeelrlpl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(cleanData)
      });

      if (!response.ok) throw new Error("Erro no envio");

      localStorage.setItem("lastContactSubmit", Date.now());

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
        className: "bg-[#2D5016] text-white border-none"
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        empresa: ''
      });

    } catch (error) {

      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar sua mensagem. Tente novamente mais tarde.",
        className: "bg-red-600 text-white border-none shadow-2xl font-medium",
        variant: "destructive"
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Endereço (Clique para abrir)",
      content: "Rua Ricardo Marin s/nº - Rua Projetada Santa Clara, Lages / SC",
      link: "https://maps.app.goo.gl/o1Uxe2PAqPe8V7Kt6"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Telefone",
      content: "(49) 3289-8467 (Clique para chamar)",
      link: "tel:+554932898467"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      content: "socialpml2@gmail.com (Clique para mandar um e-mail)",
      link: "mailto:socialpml2@gmail.com"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "WhatsApp",
      content: "(49) 3289-8495 (Clique para abrir)",
      link: "https://wa.me/554932898495"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Contato - Presídio Masculino de Lages</title>
        <meta name="description" content="Entre em contato com o Presídio Masculino de Lages." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Entre em Contato</h1>
            <p className="text-lg text-gray-600">Estamos aqui para ajudar. Envie sua mensagem ou utilize nossos canais.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {contactInfo.map((info, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all text-center">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4 text-[#2D5016]">{info.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">{info.title}</h3>
                    {info.link ? (
                      <a href={info.link} className="text-sm text-gray-600 hover:text-[#2D5016] transition-colors">{info.content}</a>
                    ) : (
                      <p className="text-sm text-gray-600">{info.content}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Envie uma Mensagem</CardTitle>
                  <CardDescription>Retornaremos o mais breve possível.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">

                    
                    <input//anti bot
                    type="text"
                    name="empresa"
                    style={{ display: "none" }}
                    onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                    />
                  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                      <Input
                        disabled={isSubmitting}
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Seu nome completo"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <Input
                        type="email"
                        disabled={isSubmitting}
                        className={!isEmailValid ? "border-red-500 focus-visible:ring-red-500" : ""}
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                      />
                      {!isEmailValid && <span className="text-xs text-red-500 mt-1">Insira um e-mail válido</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <Input
                        type="tel"
                        disabled={isSubmitting}
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(49) 00000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assunto *</label>
                      <Input
                        disabled={isSubmitting}
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="Assunto da mensagem"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem *</label>
                      <textarea
                        disabled={isSubmitting}
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="Escreva sua mensagem aqui..."
                        rows={6}
                        className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D5016] disabled:opacity-50 resize-none"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-[#2D5016] hover:bg-[#1f3810] text-white h-12 text-lg"
                      disabled={isSubmitting || submitted}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando...</>
                      ) : submitted ? (
                        "Sucesso!"
                      ) : (
                        <><Send className="w-5 h-5 mr-2" /> Enviar Mensagem</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Horário de Atendimento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Segunda a Sexta:</span>
                    <span className="text-gray-600">10h às 17h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Sábado, Domingo e Feriados:</span>
                    <span className="text-gray-600">FECHADO</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-blue-900 mb-3 text-sm">Dica Importante</h3>
                  <p className="text-xs text-blue-800">
                    Para agilizar, informe o nome completo e galeria do interno ao entrar em contato.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#2D5016] text-white border-0">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 text-sm">Atendimento Presencial</h3>
                  <p className="text-xs text-gray-200">
                    Dirija-se ao setor social com documento oficial com foto.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;