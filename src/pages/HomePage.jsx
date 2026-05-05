import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  HelpCircle, 
  Mail, 
  WalletCards as IdCard, 
  UserPlus, 
  LogIn, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  const quickAccess = [
    {
      icon: <IdCard className="w-8 h-8" />,
      title: 'Carteirinha de Visitante',
      description: 'Solicite sua carteirinha de visitante',
      link: '/carteirinha'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Correspondência',
      description: 'Saiba como enviar cartas',
      link: '/correspondencia'
    },
    {
      icon: <HelpCircle className="w-8 h-8" />,
      title: 'Perguntas Frequentes',
      description: 'Tire suas dúvidas',
      link: '/faq'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: 'Contato',
      description: 'Entre em contato conosco',
      link: '/contato'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Presídio Masculino de Lages - Início</title>
        <meta name="description" content="Portal oficial do Presídio Masculino de Lages." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* Barra Superior Institucional */}
        <div className="bg-white border-b border-gray-100 py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <a 
              href="https://www.sap.sc.gov.br/dpp/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-gray-500 hover:text-[#2D5016] flex items-center gap-1.5 transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" /> Acessar Portal SEJURI / SC
            </a>
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
                 Unidade: Lages / SC
               </span>
            </div>
          </div>
        </div>

        {/* Login/Register CTA Section */}
        <section className="bg-white py-10 border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <Link to="/cadastro-visitante">
                <Button variant="outline" className="w-full h-24 text-xl font-extrabold border-2 border-[#2D5016] text-[#2D5016] rounded-xl hover:bg-green-50 shadow-sm transition-all hover:scale-[1.01] flex flex-col gap-1.5 uppercase">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-7 h-7" />
                    Novo Cadastro
                  </div>
                  {/* Texto aumentado para text-xs e opacidade levemente ajustada */}
                  <span className="text-xs font-bold opacity-80 italic lowercase tracking-tight">
                    Ainda não possui acesso? Clique aqui
                  </span>
                </Button>
              </Link>

              <Link to="/login">
                <Button className="w-full h-24 text-xl font-extrabold bg-[#2D5016] text-white rounded-xl hover:bg-[#1f3810] shadow-md transition-all hover:scale-[1.01] flex flex-col gap-1.5 uppercase">
                  <div className="flex items-center gap-3">
                    <LogIn className="w-7 h-7" />
                    Entrar no Sistema
                  </div>
                  {/* Texto aumentado para text-xs e opacidade levemente ajustada */}
                  <span className="text-xs font-bold opacity-90 italic lowercase tracking-tight">
                    Já é cadastrado? Acesse sua área restrita
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-rose-500 border-b-4 border-rose-700 text-black px-6 py-5 rounded-3xl shadow-lg flex flex-col md:flex-row items-center gap-4">
            
            {/* Ícone de Alerta Intermitente */}
            <div className="bg-black p-2 rounded-full shrink-0 animate-pulse">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>

            <div className="text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-black/70">
                Acesso Restrito / Sigiloso
              </p>
              <p className="text-sm md:text-base font-medium leading-tight text-black">
                As informações contidas nesta página são restritas. Se você não for pessoa interessada ou teve acesso por engano, <strong className="font-black uppercase tracking-tighter decoration-black underline decoration-2 underline-offset-4">favor sair imediatamente.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
<section className="relative text-white min-h-[500px] flex items-center justify-center overflow-hidden my-8 mx-4 rounded-3xl shadow-2xl">
  {/* Imagem de Fundo com Fade In lento */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2.0 }} // A imagem surge suavemente em 2 segundos
    className="absolute inset-0 bg-cover bg-center"
    style={{ backgroundImage: "url('https://i.postimg.cc/tT2dth22/FIMI0124.jpg')" }}
  />
  
  {/* Overlay escuro que acompanha a suavidade */}
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.6 }} // Nível do overlay bg-black/60
    transition={{ duration: 2.0 }}
    className="absolute inset-0 bg-black" 
  />

  <div className="relative max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
    
    {/* Logo: Aparece crescendo lentamente */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ 
        duration: 1.5, // Aumentado de 1.0 para 1.5
        ease: "easeOut" 
      }} 
      className="mb-6"
    >
      <img
        src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/3057556dd160826150df35025e289f73.png"
        alt="Logo Polícia Penal"
        className="w-auto h-40 md:h-52 mx-auto drop-shadow-2xl"
      />
    </motion.div>

    {/* Texto: Sobe devagar após o início da animação da logo */}
    <motion.div 
      initial={{ opacity: 0, y: 30 }} // Aumentado o deslocamento para parecer mais fluido
      animate={{ opacity: 1, y: 0 }} 
      transition={{ 
        duration: 1.2, // Aumentado de 0.8 para 1.2
        delay: 0.6,    // Atraso levemente maior para dar ritmo
        ease: "easeOut"
      }}
      className="max-w-3xl"
    >
      <h1 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter">
        Presídio Masculino de Lages
      </h1>
      <p className="text-base md:text-lg text-gray-200 font-medium max-w-xl mx-auto">
        Portal de Serviços ao Visitante e Gestão de Agendamentos
      </p>
    </motion.div>

  </div>
</section>

        {/* Quick Access */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Serviços Disponíveis</h2>
              <div className="w-20 h-1.5 bg-[#2D5016] mx-auto rounded-full mb-4"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickAccess.map((item, index) => (
                <Link key={index} to={item.link}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-none bg-gray-50">
                    <CardContent className="p-8 text-center flex flex-col items-center">
                      <div className="mb-6 text-[#2D5016] bg-white p-4 rounded-2xl shadow-sm">
                        {item.icon}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 mb-2 uppercase tracking-tighter">{item.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;