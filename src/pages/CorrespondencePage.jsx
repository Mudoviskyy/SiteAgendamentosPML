import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, MapPin, FileText, Image, AlertTriangle, CheckCircle, ArrowLeft, ShieldCheck, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CorrespondencePage = () => {
  // Dados atualizados conforme Portaria nº 2189/GABS/SEJURI/2025
  const correspondenceTypes = [
    {
      icon: <Mail className="w-8 h-8 text-[#2D5016]" />,
      title: "Cartas Pessoais",
      description: "Kit carta mensal (Art. 445)",
      allowed: [
        "Até 05 folhas brancas (A4 ou pautada)",
        "01 Caneta vermelha de corpo TRANSPARENTE",
        "Até 02 Envelopes brancos simples",
        "Selos postais simples"
      ],
      notAllowed: [
        "Canetas de corpo opaco ou cor preta",
        "Adesivos, glitter ou perfumes",
        "Papéis coloridos ou com colagens",
        "Envelopes com forro ou plástico bolha"
      ]
    },
    {
      icon: <Image className="w-8 h-8 text-[#2D5016]" />,
      title: "Fotografias",
      description: "Regras de vínculo e segurança",
      allowed: [
        "01 Foto 10x15cm por correspondência",
        "Vínculo: Filhos, enteados, netos ou irmãos",
        "Sem qualquer escrita no verso",
        "Imagens de família e locais públicos"
      ],
      notAllowed: [
        "Mais de 01 foto por envelope",
        "Fotos polaroid ou com molduras",
        "Nudez (mesmo parcial) ou apologia",
        "Gestos/símbolos de facções ou armas"
      ]
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-[#2D5016]" />,
      title: "Conteúdo e Segurança",
      description: "Critérios de monitoramento",
      allowed: [
        "Textos em língua portuguesa",
        "Assuntos estritamente familiares",
        "Identificação clara do remetente",
        "Respeito às normas da unidade"
      ],
      notAllowed: [
        "Números de telefone ou redes sociais",
        "Dados bancários e Chaves PIX",
        "Mensagens cifradas ou em códigos",
        "Endereços de outros internos"
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Correspondência - Presídio Masculino de Lages</title>
        <meta name="description" content="Saiba como enviar cartas e correspondências para internos do Presídio Masculino de Lages conforme a Portaria 2189/2025." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Botão Voltar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link to="/">
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-200 text-gray-600 font-bold uppercase text-xs tracking-widest">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Início
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Correspondência</h1>
            <p className="text-lg text-gray-600">Regulamentado pela Portaria Estadual nº 2189/2025</p>
          </motion.div>

          {/* Mailing Address - MANTIDO CONFORME SOLICITADO */}
          <div className="mb-12">
            <Card className="border-2 border-[#2D5016]">
              <CardHeader className="bg-[#2D5016] text-white">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <MapPin className="w-6 h-6" />
                  Endereço para Correspondência
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-gray-900">Presídio Masculino de Lages</p>
                  <p className="text-gray-700">Rua Ricardo Marin s/nº</p>
                  <p className="text-gray-700">Rua Projetada Santa Clara</p>
                  <p className="text-gray-700">Lages / SC</p>
                  <p className="text-gray-700 font-medium mt-4">CEP: [88513-210]</p>

                  <a href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline font-medium justify-center"
                  >
                    <MapPin size={18} />
                    Ver localização no Google Maps
                  </a>
                </div>

                <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="text-sm text-yellow-800 font-bold mb-2 uppercase">
                    ⚠️ Importante: Instruções de Envio
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Envio exclusivo via Correios ou entrega por visitante cadastrado (i-PEN).</li>
                    <li>Obrigatório: Nome completo do remetente e destinatário no envelope.</li>
                    <li>Indicar claramente o nome da Unidade Prisional.</li>
                    <li>Informe a matrícula do detento para agilizar a triagem.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Correspondence Types - ATUALIZADO */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Normas de Postagem</h2>
              <p className="text-lg text-gray-600">O descumprimento destas regras resultará na retenção do material</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {correspondenceTypes.map((type, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all border-t-4 border-t-[#2D5016]">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        {type.icon}
                      </div>
                      <CardTitle className="text-xl">{type.title}</CardTitle>
                      <CardDescription className="font-medium text-[#2D5016]">{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-sm text-green-700">Permitido:</p>
                        </div>
                        <ul className="space-y-1 ml-7">
                          {type.allowed.map((item, i) => (
                            <li key={i} className="text-sm text-gray-600">• {item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Ban className="w-5 h-5 text-red-600" />
                          <p className="font-semibold text-sm text-red-700">Proibido:</p>
                        </div>
                        <ul className="space-y-1 ml-7">
                          {type.notAllowed.map((item, i) => (
                            <li key={i} className="text-sm text-gray-600">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* General Rules & Prohibited Items - ATUALIZADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-green-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Protocolo Operacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <span><strong>Vistoria Obrigatória:</strong> Todas as cartas são abertas, lidas e revistadas (Art. 445).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <span><strong>Vínculo de Fotos:</strong> Apenas fotos de parentes diretos autorizados pela normativa de 2025.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">3.</span>
                    <span><strong>Idioma:</strong> Conteúdo deve ser exclusivamente em português para permitir a triagem.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">4.</span>
                    <span><strong>Caneta:</strong> A regra da caneta de corpo transparente é rígida para evitar ocultação de ilícitos.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Segurança Preventiva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span><strong>Dados Sensíveis:</strong> Proibido envio de Chaves PIX, contas ou cartões.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span><strong>Contatos:</strong> Proibido números de telefone ou usuários de redes sociais.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span><strong>Substâncias:</strong> Cartas com cheiro de perfume ou manchas de óleo serão descartadas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span><strong>Códigos:</strong> Qualquer desenho ou sigla que remeta a facções causará sanção disciplinar ao interno.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default CorrespondencePage;