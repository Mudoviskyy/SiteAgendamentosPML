import React from 'react';
import { MapPin, Phone, Mail, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom'; // Importado para navegação interna

const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="https://horizons-cdn.hostinger.com/dac2f681-f852-4d60-9650-38bb01472625/5f6d53c1563b5a3d23c1964d02f80076.png" 
                alt="Logo Polícia Penal" 
                className="max-h-16 w-auto"
              />
              <span className="font-semibold text-lg leading-tight">Presídio Masculino de Lages</span>
            </div>
            <p className="text-gray-400 text-sm">
              Instituição penitenciária comprometida com a ressocialização e segurança.
            </p>
          </div>

          <div>
            <p className="font-semibold text-lg mb-4 text-[#2D5016]">Endereço</p>
            <div className="space-y-4">
                <div className="text-gray-400 text-sm">
                  <p className="text-gray-400 text-sm mb-2">Rua Ricardo Marin s/n - Lages - SC</p>
                  <a 
                    href="https://maps.app.goo.gl/1UPPPvtZow4a7dCq8" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-xs hover:text-white transition-colors group"
                  >
                    <MapPin className="text-[#2D5016] w-4 h-4" />
                    <span>Acesso no MAPA<br/>(Clique para abrir no GOOGLE Maps)</span>
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </div>
              </div>
          </div>

          <div>
            <p className="font-semibold text-lg mb-4 text-[#2D5016]">Contato</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-[#2D5016]" />
                <span className="text-gray-400 text-sm">(49) 3289-8467</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-[#2D5016]" />
                <a 
                  href="mailto:socialpml2@gmail.com" 
                  className="text-gray-400 text-sm hover:text-[#2D5016] transition-colors"
                >
                  socialpml2@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold text-lg mb-4 text-[#2D5016]">WhatsApp</p>
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-[#2D5016]" />
              <a 
                href="https://wa.me/554932898495" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 text-sm hover:text-[#2D5016] transition-colors"
              >
                (49) 3289-8495
              </a>
            </div>
          </div>
        </div>

        {/* Seção da Política de Privacidade e Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col items-center gap-4">
          <Link 
            to="/politica-privacidade" 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-widest bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800 hover:border-[#2D5016]"
          >
            <ShieldCheck className="w-4 h-4 text-[#2D5016]" />
            Política de Privacidade - LGPD
          </Link>
          
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Presídio Masculino de Lages. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;