import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LogIn, UserPlus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const HomeRemunerados = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* Hero Section - Ocupa a tela inteira e contém toda a identidade */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden px-6">
        
        {/* Imagem de Fundo Ajustada */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://i.postimg.cc/tT2dth22/FIMI0124.jpg')",
          }}
        />

        {/* Overlay para Contraste */}
        <div className="absolute inset-0 bg-black/70 z-0" />

        {/* Conteúdo Centralizado sobre a Imagem */}
        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center">
          
          {/* Bloco de Identidade Superior (Shield) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <Shield className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <h2 className="text-xl md:text-2xl font-semibold tracking-wide uppercase text-green-500">
              Sistema de Remunerados
            </h2>
          </motion.div>

          {/* Logo Principal (Brasão) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 1.0, delay: 0.2 }} 
            className="mb-8"
          >
            <img
              src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/3057556dd160826150df35025e289f73.png"
              alt="Logo Polícia Penal de Santa Catarina"
              className="w-auto h-40 md:h-56 mx-auto drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
            
          {/* Títulos Principais */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-10"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
              Presídio Masculino de Lages
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Plataforma interna para gerenciamento de serviços remunerados.
            </p>
          </motion.div>

          {/* Botões de Ação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col md:flex-row gap-4 w-full justify-center"
          >
            <Link to="/remunerados/login">
              <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-lg px-10 py-7 flex items-center gap-3 shadow-2xl transition-all">
                <LogIn className="w-5 h-5" />
                Entrar no Sistema
              </Button>
            </Link>

            <Link to="/remunerados/cadastro">
              <Button className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 text-lg px-10 py-7 flex items-center gap-3 backdrop-blur-sm transition-all">
                <UserPlus className="w-5 h-5" />
                Criar Conta
              </Button>
            </Link>
          </motion.div>

          {/* Rodapé Interno da Hero */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-gray-400 text-xs md:text-sm mt-12 font-medium"
          >
            Acesso Restrito: Servidores da Unidade • DPP/SC
          </motion.p>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="py-6 bg-black text-center text-gray-600 text-xs border-t border-white/5">
        <p>© 2026 Presídio Masculino de Lages • Departamento de Administração Prisional</p>
      </footer>
    </div>
  );
};

export default HomeRemunerados;