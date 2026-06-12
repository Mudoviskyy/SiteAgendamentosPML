
import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Lock, Eye, UserCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PoliticaPrivacidade = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Política de Privacidade - Presídio Masculino de Lages</title>
        <meta name="description" content="Política de Privacidade e Proteção de Dados Pessoais do Portal de Visitas do PML, em conformidade com a LGPD." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Botão Voltar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 hover:text-gray-800 text-gray-600 font-bold uppercase text-xs tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o Início
            </Button>
          </motion.div>

          {/* Cabeçalho da Página */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <div className="bg-[#2D5016]/10 p-4 rounded-full">
                <ShieldCheck className="w-12 h-12 text-[#2D5016]" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 uppercase tracking-tighter">
              Política de Privacidade
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Proteção de Dados Pessoais e conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </motion.div>

          {/* Conteúdo Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-[#2D5016] text-white py-8 px-10">
                <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                  <Lock className="w-6 h-6" />
                  Termos e Diretrizes de Segurança
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-10 space-y-10 text-gray-700 leading-relaxed">
                
                {/* Seção Especial - Aviso de Finalidade (Portaria 2189.2025) */}
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-950 text-sm md:text-base space-y-3 shadow-inner">
                  <div className="flex items-center gap-3 text-amber-800">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 shrink-0" />
                    </div>
                    <h3 className="font-black uppercase tracking-tight text-base md:text-lg">
                      Nota de Aviso: Finalidade do Sistema
                    </h3>
                  </div>
                  <p className="leading-relaxed">
                    O sistema foi criado <strong>única e exclusivamente</strong> para o uso de visitantes (familiares ou amigos que tenham algum parente ou amigo em situação de privação de liberdade), em estrito cumprimento da{' '}
                    <strong className="text-amber-900">Portaria 2189.2025 – PROCEDIMENTOS OPERACIONAIS – DPP</strong>.
                  </p>
                  <p className="leading-relaxed">
                    Qualquer outra finalidade dada ao uso deste portal estará <strong>violando tal portaria</strong>.
                  </p>
                  <div className="pt-2">
                    <a
                      href="https://sejuri.sc.gov.br/download/portaria-2189-2025-procedimentos-operacionais-dpp/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs md:text-sm transition-all shadow-sm"
                    >
                      <span>Acessar Portaria Oficial 2189.2025</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed pt-2 border-t border-amber-200/60">
                    <strong>Dúvidas ou Informações:</strong> Em caso de dúvidas referentes às regras internas do Presídio Masculino de Lages, a equipe de suporte sugere o contato direto com o setor social ou com a Direção da unidade.
                  </p>
                </div>

                {/* 1. Introdução */}
                <section>
                  <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <span className="text-[#2D5016]">1.</span> Introdução
                  </h2>
                  <p className="text-sm md:text-base text-gray-600">
                    A presente Política de Privacidade e Proteção de Dados Pessoais tem por finalidade informar, de forma clara, transparente e objetiva, como ocorre o tratamento de dados pessoais no âmbito do <strong>Portal de Visitas do Presídio Masculino de Lages (PML)</strong>, em conformidade com a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD).
                  </p>
                  <p className="mt-4 text-sm md:text-base text-gray-600 italic">
                    O Portal tem como objetivo viabilizar o cadastro de visitantes, a validação documental e o agendamento de visitas, atendendo às exigências legais e administrativas do sistema prisional.
                  </p>
                </section>

                <hr className="border-gray-100" />

                {/* 2 & 3. Controlador e Dados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section>
                    <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                      <span className="text-[#2D5016]">2.</span> Controlador
                    </h2>
                    <p className="text-sm text-gray-600">
                      O tratamento dos dados pessoais é realizado pelo Presídio Masculino de Lages, na qualidade de controlador, responsável pelas decisões referentes ao tratamento de dados pessoais.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                      <span className="text-[#2D5016]">3.</span> Dados Coletados
                    </h2>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li><strong>• Cadastrais:</strong> Nome, CPF, nascimento, telefone e e-mail.</li>
                      <li><strong>• Vínculo:</strong> Nome e matrícula do apenado.</li>
                      <li><strong>• Agendamento:</strong> Tipo de visita, data e horário.</li>
                      <li><strong>• Documentos:</strong> Foto 3x4, Identidade, Comprovante de Residência e Vacinação.</li>
                    </ul>
                  </section>
                </div>

                <hr className="border-gray-100" />

                {/* 4. Finalidade */}
                <section>
                  <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <span className="text-[#2D5016]">4.</span> Finalidade do Tratamento
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Identificação e autenticação",
                      "Validação para emissão de carteirinha",
                      "Gestão e controle de agendamentos",
                      "Segurança institucional e auditoria",
                      "Cumprimento de obrigações legais",
                      "Comunicação direta com o usuário"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border-l-4 border-[#2D5016]">
                        <UserCheck className="w-4 h-4 text-[#2D5016]" />
                        <span className="text-xs font-bold text-gray-700 uppercase">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <hr className="border-gray-100" />

                {/* 5, 6 & 7. Detalhes Técnicos */}
                <div className="space-y-8">
                  <SectionItem title="5. Base Legal" content="O tratamento ocorre com fundamento nos Art. 7º, incisos II, III, V e VI da LGPD (Cumprimento de obrigação legal, execução de políticas públicas e exercício regular de direitos)." />
                  <SectionItem title="6. Compartilhamento" content="Os dados poderão ser compartilhados exclusivamente com órgãos públicos competentes, autoridades administrativas e judiciais para fins institucionais. Vedado o uso comercial." />
                  <SectionItem title="7. Segurança" content="Adoção de medidas técnicas como controle de acesso por autenticação, restrição de permissões (RLS), criptografia, monitoramento e registro de logs." />
                  <SectionItem title="8. Retenção" content="Os dados são mantidos pelo período necessário para cumprimento das finalidades legais, sendo posteriormente eliminados ou anonimizados conforme normas administrativas." />
                </div>

                <hr className="border-gray-100" />

                {/* 9. Direitos do Titular */}
                <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h2 className="text-xl font-black text-blue-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <span className="text-blue-600">9.</span> Direitos do Titular
                  </h2>
                  <p className="text-sm text-blue-800 mb-4 font-medium">Garantimos ao cidadão o exercício dos direitos previstos na LGPD:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px] md:text-xs font-black uppercase tracking-wider text-blue-700">
                    <span className="bg-white p-2 rounded shadow-sm text-center">Acesso aos dados</span>
                    <span className="bg-white p-2 rounded shadow-sm text-center">Correção</span>
                    <span className="bg-white p-2 rounded shadow-sm text-center">Exclusão</span>
                    <span className="bg-white p-2 rounded shadow-sm text-center">Portabilidade</span>
                    <span className="bg-white p-2 rounded shadow-sm text-center">Revogação</span>
                    <span className="bg-white p-2 rounded shadow-sm text-center">Confirmação</span>
                  </div>
                </section>

                {/* Responsabilidades e Contato */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-3">
                    <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">11. Responsabilidades</h3>
                    <p className="text-xs text-gray-500">O usuário é responsável pela veracidade das informações. O uso indevido ou fornecimento de dados falsos resultará em bloqueio de acesso e medidas administrativas.</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">14. Contato e DPO</h3>
                    <p className="text-xs text-gray-500">Para dúvidas sobre privacidade, utilize os canais oficiais do Setor Social do PML ou o e-mail institucional indicado na página de contato.</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>
          
          <p className="text-center mt-8 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
            Última atualização: Março de 2026 | Presídio Masculino de Lages
          </p>
        </div>
      </div>
    </>
  );
};

// Componente Auxiliar para itens de seção
function SectionItem({ title, content }) {
  return (
    <div>
      <h3 className="text-sm font-black text-gray-900 uppercase mb-2 tracking-widest flex items-center gap-2">
        <Eye className="w-4 h-4 text-[#2D5016]" /> {title}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
    </div>
  );
}

export default PoliticaPrivacidade;
