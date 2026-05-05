import React, { useState, useEffect } from 'react';
import { ShieldAlert, Info } from 'lucide-react';

const SecurityBanner = () => {
  const [ip, setIp] = useState('Detectando...');

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setIp(data.ip);
        // Armazena globalmente para os serviços capturarem no momento do envio
        window.USER_IP = data.ip;
        window.USER_AGENT = navigator.userAgent;
      } catch (error) {
        console.error('Erro ao capturar IP:', error);
        setIp('Indisponível');
      }
    };

    fetchIp();
  }, []);

  return (
    <div className="bg-[#1a1a1a] text-white py-1.5 px-4 flex items-center justify-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b border-red-900/30 shadow-2xl">
      <div className="flex items-center gap-2 text-red-500 animate-pulse">
        <ShieldAlert className="w-3 h-3 md:w-4 md:h-4" />
        <span>Acesso Monitorado</span>
      </div>
      
      <div className="h-4 w-px bg-gray-700 hidden md:block" />
      
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Seu IP de Origem:</span>
        <span className="text-white font-mono bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
          {ip}
        </span>
      </div>

      <div className="h-4 w-px bg-gray-700 hidden md:block" />

      <div className="hidden lg:flex items-center gap-2 text-gray-400">
        <Info className="w-3 h-3" />
        <span>Para sua segurança, este acesso está sendo registrado em nossos servidores.</span>
      </div>
    </div>
  );
};

export default SecurityBanner;
