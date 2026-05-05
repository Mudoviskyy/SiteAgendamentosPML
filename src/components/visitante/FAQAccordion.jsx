import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle, Construction, Package, Mail, FileText, Camera, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const FAQAccordion = () => {
  const faqItems = [
    {
      question: "Como agendar uma visita?",
      answer: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-800 text-xs">
            <strong>Pré-requisito:</strong> É obrigatório ter uma <strong>carteirinha ativa</strong> no portal com a <strong>Data de Emissão</strong> idêntica à da sua carteirinha oficial.
          </div>

          <p className="font-bold text-gray-900 mt-2">Passo a passo para agendar:</p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Acesse o seu painel e clique no botão verde <strong>"+ Novo Agendamento"</strong>.</li>
            <li>Selecione o tipo de visita desejada (Social, Vídeo ou Íntima).</li>
            <li>Escolha a data e o horário disponíveis no calendário.</li>
            <li>Confirme os dados e aguarde a análise.</li>
          </ol>
        </div>
      )
    },
    {
      question: "Como funciona para menores de idade?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>Menores de idade não precisam (e não devem) ter um cadastro próprio no portal com e-mail e senha.</p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-blue-800">
            Na tela de solicitação de agendamento, você pode adicioná-los usando os campos <strong>"Visitante 2"</strong> e <strong>"Visitante 3"</strong>, inserindo os respectivos prontuários.
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3 text-amber-800 text-xs font-bold uppercase tracking-wider">
            ⚠️ Atenção: Apenas o Pai, a Mãe ou o Responsável Legal têm permissão para adicionar menores no agendamento.
          </div>
        </div>
      )
    },
    {
      question: "Qual é o horário de funcionamento das visitas?",
      answer: (
        <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
          <p>O horário geral de visitas ocorre normalmente das <strong>9:00 às 18:00</strong>.</p>
          <p className="text-xs text-gray-500 italic">
            * Note que os horários exatos podem variar dependendo da galeria do interno e do tipo de visita (Social, Íntima ou Vídeo). Verifique a disponibilidade exata no calendário no momento do agendamento.
          </p>
        </div>
      )
    },
    {
      question: "Quais documentos preciso levar no dia?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>Para entrar na unidade no dia da visita, é <strong>obrigatório</strong> ter em mãos:</p>
          <ul className="list-disc ml-5 space-y-2 font-medium text-gray-900">
            <li>Documento oficial com foto (RG, CNH ou Carteira de Trabalho).</li>
            <li>Carteirinha de Visitante (física ou digital) devidamente atualizada e aprovada.</li>
          </ul>
        </div>
      )
    },
    {
      question: "Como cancelar um agendamento?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>Você pode gerenciar e cancelar suas visitas pela aba <strong>"Meus Agendamentos"</strong>, mas existem prazos restritos:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="font-bold text-green-800 text-xs uppercase">Mais de 7 dias antes</p>
              <p className="text-xs mt-1 text-green-700">O botão de cancelar estará liberado no portal. O cancelamento é imediato.</p>
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="font-bold text-red-800 text-xs uppercase">Menos de 7 dias antes</p>
              <p className="text-xs mt-1 text-red-700">O botão será bloqueado. Cancelamentos de última hora devem ser solicitados <strong>via WhatsApp</strong> e passarão por análise.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      question: "Quanto tempo leva para o agendamento ser aprovado?",
      answer: (
        <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
          <p>A análise pela administração pode levar até <strong>3 dias úteis</strong>.</p>
          <p>Você receberá uma notificação no seu painel assim que o status for atualizado (mudando para <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold mx-1 text-[10px]">APROVADO</span> ou <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold mx-1 text-[10px]">CANCELADO/RECUSADO</span>).</p>
        </div>
      )
    },
    {
      question: "Posso agendar múltiplas visitas?",
      answer: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>Sim, mas o sistema segue os limites impostos pelas regras da unidade e do Departamento de Polícia Penal:</p>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-around text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Visitas Sociais</p>
              <p className="text-lg font-black text-[#2D5016]">Máx. 3 / mês</p>
            </div>
            <div className="w-px bg-slate-200 mx-2"></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Visitas Íntimas</p>
              <p className="text-lg font-black text-[#2D5016]">Máx. 2 / mês</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium">
            * Nota: Você pode ter até <strong>5 agendamentos ativos/pendentes</strong> simultaneamente no sistema.
          </p>
        </div>
      )
    },
    {
      question: "Posso enviar e receber cartas? (Correspondência)",
      answer: (
        <div className="max-w-2xl mx-auto space-y-6 text-sm text-gray-700 leading-relaxed py-6 px-4">
          {/* Cabeçalho */}
          <div className="p-4 bg-slate-50 border-l-4 border-[#2D5016] rounded-r-xl">
            <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Envio de Correspondências (Kit Carta)</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Portaria nº 2189/GABS/SEJURI/2025</p>
          </div>

          <p className="text-xs text-slate-600">Para que sua carta seja entregue sem problemas, siga rigorosamente estas regras:</p>

          {/* Grid de Regras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MATERIAIS PERMITIDOS */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-blue-600">
                <Package className="w-5 h-5" />
                <span className="font-bold uppercase text-[11px]">Materiais (Limite Mensal)</span>
              </div>
              <ul className="space-y-2 text-[12px] text-slate-600 font-medium">
                <li>• <strong>05 Folhas:</strong> Brancas (A4 ou caderno)</li>
                <li>• <strong>02 Envelopes:</strong> Brancos (sem plástico bolha)</li>
                <li>• <strong>02 Selos Postais:</strong> Simples</li>
                <li>• <strong>01 Caneta Azul:</strong> Corpo TRANSPARENTE</li>
              </ul>
            </div>

            {/* REGRAS PARA FOTOS */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-rose-600">
                <Camera className="w-5 h-5" />
                <span className="font-bold uppercase text-[11px]">Regras para Fotos</span>
              </div>
              <p className="text-[12px] text-slate-600 mb-2">Máximo de <strong>01 foto</strong> por carta:</p>
              <ul className="space-y-1 text-[11px] text-slate-500">
                <li className="flex items-center gap-1 text-red-600 font-bold">✕ Proibido escrita no verso</li>
                <li className="flex items-center gap-1 text-red-600 font-bold">✕ Proibido nudez ou gestos de crime</li>
                <li className="flex items-center gap-1 text-green-600 font-bold">✓ Use fotos atuais e nítidas</li>
              </ul>
            </div>
          </div>

          {/* PROIBIÇÕES ESTREITAS */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <h5 className="font-black uppercase text-xs tracking-wider">Proibições (A carta será BLOQUEADA se tiver:)</h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-bold text-red-900">
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">📵 Números de telefone ou Redes Sociais</div>
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">💰 Dados Bancários ou Chaves PIX</div>
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">📍 Endereços de outros presos/alas</div>
              <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">🤐 Linguagem em código ou siglas</div>
            </div>
          </div>

          {/* MONITORAMENTO */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="bg-amber-500 p-1.5 rounded-lg shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-900 uppercase mb-1">Aviso de Segurança (Art. 445)</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Todas as cartas passam por <strong>triagem, leitura e registro</strong> pela segurança. Materiais fora das normas serão retidos e não entregues.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            📌 O Envio é EXCLUSIVO via Correios.
          </p>
        </div>
      )
    },
    {
      question: "Quem posso contatar para outras dúvidas?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>Para questões não listadas no FAQ, o Setor Social está à disposição nos seguintes canais:</p>
          <ul className="space-y-2 mt-2">
            <li className="flex items-center gap-2">
              <span className="bg-gray-100 p-1.5 rounded-md">📧</span>
              <strong>E-mail:</strong> <a href="mailto:socialpml2@gmail.com" className="text-[#2D5016] font-medium hover:underline">socialpml2@gmail.com</a>
            </li>
            <li className="flex items-center gap-2">
              <span className="bg-gray-100 p-1.5 rounded-md">📞</span>
              <strong>Telefone:</strong> Verifique os números da unidade na página principal ou no rodapé do site (Atendimento em horário comercial).
            </li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#2D5016]" />
          Perguntas Frequentes
        </CardTitle>
        <CardDescription>
          Tire suas dúvidas sobre o funcionamento das visitas e regras da unidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-gray-800">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default FAQAccordion;