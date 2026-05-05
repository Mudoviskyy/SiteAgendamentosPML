import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, ArrowLeft, Package, Mail, Camera, AlertTriangle, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FAQPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openIndex, setOpenIndex] = useState(null);
  const firstResultRef = useRef(null);

  // 🔥 Debounce inteligente (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  const faqs = [
    {
      question: "Seu familiar foi detido recentemente? (Triagem)",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <ul className="list-disc ml-5 space-y-2">
            <li>O interno ficará em cela de triagem por até <strong>10 dias</strong>, com banho de sol diário.</li>
            <li><strong>Não tem direito</strong> a visitas ou recebimento de mantimentos nesse período (todos os itens de primeira necessidade são fornecidos pela unidade).</li>
            <li>O advogado já pode marcar atendimento presencial ou virtual.</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3 text-amber-800 text-xs">
            <strong>Atenção à Saúde:</strong> Caso o interno faça uso de remédio controlado, a família deve informar imediatamente através do telefone <strong>(49) 3289-8475</strong> (Saúde) ou <strong>(49) 3289-8467</strong> (Portaria).
          </div>
        </div>
      )
    },
    {
      question: "Quem pode encaminhar a carteirinha de visitação?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>A carteirinha pode ser solicitada pelas seguintes pessoas, mediante agendamento prévio:</p>
          <p className="font-medium text-gray-900 border-l-4 border-[#2D5016] pl-3 bg-gray-50 py-2">
            Cônjuge, companheiro(a), ascendentes, descendentes (incluindo enteados), parentes colaterais por afinidade e amigos.
          </p>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 text-xs mt-2">
            <strong>Nota:</strong> Para menores de idade, a apresentação da carteirinha também é obrigatória.
          </div>
        </div>
      )
    },
    {
      question: "Como funciona o cadastro e visita para menores de idade?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>Menores de idade <strong>não têm permissão</strong> para se cadastrarem diretamente no sistema. Não utilize data de nascimento falsa com o CPF do menor!</p>

          <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-xs font-medium">
            ⚠️ As informações cadastradas DEVEM ser estritamente verdadeiras.
          </div>

          <p className="font-bold text-gray-900 mt-4">Como proceder:</p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>O <strong>Pai, Mãe ou Responsável Legal</strong> deve fazer o cadastro no portal usando a sua própria carteirinha válida.</li>
            <li>No momento de solicitar o agendamento da visita, o sistema permitirá adicionar "Visitante 2" e "Visitante 3".</li>
            <li>Insira o prontuário dos menores nesses campos adicionais (Lembrando: <strong>apenas</strong> pai, mãe ou responsável podem realizar esta inclusão).</li>
          </ol>

          <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            Consulte nossa <a href="https://presidiomasculinolages.com/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-[#2D5016] font-bold hover:underline break-all">Política de Privacidade</a> para mais informações.
          </p>
        </div>
      )
    },
    {
      question: "Documentação necessária para carteirinha",
      answer: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>Para adentrar no Presídio Masculino de Lages, é <strong>obrigatório</strong> o cumprimento das exigências documentais abaixo:</p>

          <ul className="list-disc ml-5 space-y-2">
            <li><strong>RG atualizado</strong> com CPF (Decreto 10.977/2022).</li>
            <li><strong>Comprovante de residência</strong> (emitido há no máximo 90 dias) no nome do visitante. <br /><span className="text-xs text-gray-500">Aceitos: água, luz, telefone, internet, contrato de aluguel registrado em cartório ou declaração de residência assinada pelo titular da conta.</span></li>
            <li><strong>Foto 3x4</strong> recente (tirada há até 3 meses).</li>
            <li><strong>Certidão de casamento</strong> ou declaração de união estável.</li>
            <li><strong>Declaração de vacinação completa:</strong> Emitida pela UBS com o calendário SUS. <span className="text-red-600 font-bold text-xs">(Apenas comprovante da COVID-19 não será aceito)</span>.</li>
          </ul>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
            <p className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Situações Específicas:</p>
            <ul className="space-y-2 text-xs">
              <li><strong>Cônjuge:</strong> Deve apresentar certidão de casamento ou união estável.</li>
              <li><strong>Amigo(a) / Responsável:</strong> Necessário documento assinado pelo interno autorizando.</li>
              <li><strong>Menor de idade:</strong> Enviar documento do responsável legal (Com carteirinha ativa, os autorizados legais podem enviar solicitações para vincular os menores à carteirinha principal).</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4 text-xs">
            <p className="font-bold text-green-800 uppercase tracking-wider mb-2">Como Enviar a Documentação</p>
            <p><strong>1. Via Portal (Recomendado):</strong> Tente primeiro pela aba "Carteirinha" neste site.</p>
            <p className="mt-2 pt-2 border-t border-green-200"><strong>2. Via E-mail (Último caso ou Menores):</strong> Envie os documentos informando:<br />
              • Nome completo do interno<br />
              • Seu grau de parentesco<br />
              • Seu telefone de contato</p>
          </div>
        </div>
      )
    },
    {

      question: "Como funciona a entrega de pertences e kits de higiene?",

      answer: (

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">



          {/* Horários e Regras Gerais */}

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">

            <p className="font-black text-blue-900 uppercase text-[11px] tracking-widest mb-2">Horários e Regras de Entrega</p>

            <ul className="list-disc ml-5 space-y-1 text-blue-800 text-xs">

              <li><strong>Quando:</strong> Sábados e domingos, das 09h00min às 15h00min.</li>

              <li><strong>Frequência:</strong> Cada interno pode receber itens de uso pessoal uma vez a cada 90 dias.</li>

              <li><strong>Informamos que o Estado já fornece todo o material necessário e os itens abaixo não são obrigatórios! Quem pode entregar:</strong> Qualquer pessoa com carteira de visita válida, advogados ou envio via Correios.</li>

            </ul>

          </div>



          {/* Vestuário */}

          <div>

            <p className="font-bold text-gray-900 uppercase text-[11px] tracking-widest mb-1 border-b pb-1">Roupas Permitidas</p>

            <ul className="list-disc ml-5 space-y-1 text-xs mt-2">

              <li>01 Toalha de banho branca.</li>

              <li>01 Par de chinelos (tipo Havaianas) branco ou laranja.</li>

              <li>02 Pares de meias brancas (cano médio).</li>

              <li>02 Cuecas brancas.</li>

              <li>01 Bermuda, 01 calça, 01 moletom e 02 camisetas: exclusivamente na cor <strong>laranja</strong>.</li>

            </ul>

          </div>



          {/* Higiene */}

          <div>

            <p className="font-bold text-gray-900 uppercase text-[11px] tracking-widest mb-1 border-b pb-1">Itens de Higiene</p>

            <ul className="list-disc ml-5 space-y-1 text-xs mt-2">

              <li>04 Escovas de dente (serão cortadas na portaria para no máximo 8 cm).</li>

              <li>04 Cremes dentais transparentes em embalagem plástica.</li>

              <li>04 Desodorantes roll-on com líquido e embalagem transparentes.</li>

              <li>Até 2 kg de sabão em pó (embalagem lacrada e acondicionado em saco plástico transparente).</li>

              <li>01 Litro de sabonete líquido transparente (acondicionado em saco plástico).</li>

            </ul>

          </div>



          {/* Eletrônicos e Uso Coletivo */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">

              <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Eletrônicos (Uso Coletivo)</p>

              <ul className="list-disc ml-4 text-xs space-y-1">

                <li>01 Televisor (LED/LCD) de até 24 polegadas.</li>

                <li>01 Ventilador de até 30 cm de diâmetro.</li>

              </ul>

            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">

              <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider mb-1">Limpeza e Diversos</p>

              <ul className="list-disc ml-4 text-xs space-y-1">

                <li>Balde transparente de até 20L (sem alça).</li>

                <li>Desinfetante tipo "Pinho Sol" (1L) e Detergente neutro transparente (500ml).</li>

                <li>Bíblia, cadernos e caneta de tubo transparente com tinta vermelha.</li>

              </ul>

            </div>

          </div>



          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3 text-amber-800 text-xs">

            <strong>Observação:</strong> Existem itens e quantitativos diferenciados para internos que exercem <strong>trabalho externo</strong> (como protetor solar e repelente) e também itens específicos para o público LGBTQIAPN+ com nome social.

          </div>



        </div>

      )

    },

    {
      question: "Como criar um e-mail gratuito",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>
            Criar um Gmail é gratuito e rápido: acesse accounts.google.com, clique em "Criar conta", escolha "Para mim" e preencha seus dados. Defina um nome de usuário (seuemail@gmail.com) e uma senha segura. Adicione um telefone/e-mail de recuperação opcional, aceite os termos e sua conta estará ativa para uso.
          </p>
          <p className="font-bold text-gray-900 mt-4">Passo a Passo Detalhado:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong>Inicie o Cadastro:</strong> Acesse gmail.com ou accounts.google.com e clique em Criar conta.<br />
              Ajuda oficial do Google:{' '}
              <a
                href="https://share.google/srhgcXCqkZFZEAGg9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2D5016] font-bold hover:underline break-all"
              >
                https://share.google/srhgcXCqkZFZEAGg9
              </a>
            </li>
            <li><strong>Tipo de Conta:</strong> Selecione "Para uso pessoal".</li>
            <li><strong>Dados Pessoais:</strong> Digite seu nome, sobrenome e data de nascimento.</li>
            <li><strong>Nome de Usuário:</strong> Crie um e-mail exclusivo (ex: seunome@gmail.com).</li>
            <li><strong>Senha:</strong> Escolha uma senha forte com letras, números e símbolos.</li>
            <li><strong>Recuperação:</strong> Insira um celular para recuperar a conta se perder a senha.</li>
            <li><strong>Finalize:</strong> Aceite os Termos de Privacidade.</li>
          </ul>
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4 text-green-800 text-xs">
            <strong>Dica:</strong> Após criado, você pode inserir este e-mail no cadastro do portal.
          </div>
        </div>
      )
    },
    {
      question: "Telefones e Contatos da Unidade",
      answer: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="bg-white border p-4 rounded-xl shadow-sm">
            <p className="font-bold text-[#2D5016] uppercase text-xs tracking-wider mb-1">Setor Social</p>
            <p className="text-lg font-black">(49) 3289-8484</p>
            <p className="text-xs text-gray-500">Atendimento: 12h às 19h</p>
            <p className="mt-2 text-sm"><strong>WhatsApp:</strong> (49) 3289-8495</p>
          </div>
          <div className="space-y-4">
            <div className="bg-white border p-4 rounded-xl shadow-sm">
              <p className="font-bold text-[#2D5016] uppercase text-xs tracking-wider mb-1">Setor de Saúde</p>
              <p className="text-lg font-black">(49) 3289-8475</p>
            </div>
            <div className="bg-white border p-4 rounded-xl shadow-sm">
              <p className="font-bold text-[#2D5016] uppercase text-xs tracking-wider mb-1">Portaria</p>
              <p className="text-lg font-black">(49) 3289-8467</p>
              <p className="text-xs text-gray-500">Atendimento: 24 horas</p>
            </div>
          </div>
        </div>
      )
    },
    {
      question: "Posso enviar e receber cartas? (Correspondência)",
      answer: (
        <div className="max-w-2xl mx-auto space-y-6 text-sm text-gray-700 leading-relaxed py-4">
          {/* Cabeçalho */}
          <div className="p-4 bg-slate-50 border-l-4 border-[#2D5016] rounded-r-xl">
            <h4 className="font-black text-slate-800 uppercase text-xs mb-1">Envio de Correspondências (Kit Carta)</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Portaria nº 2189/GABS/SEJURI/2025</p>
          </div>

          <p className="text-xs text-slate-600">Para que sua carta seja entregue sem problemas, siga rigorosamente estas regras:</p>

          {/* Grid de Regras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      question: "Dias e Horários de Visita",
      answer: (
        <div className="space-y-4 text-sm text-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <p className="font-bold text-slate-800 uppercase text-xs">Visitas Presenciais</p>
              <p className="text-sm font-medium mt-1">Segunda a Sexta-feira</p>
              <p className="text-xs text-[#2D5016] font-bold mt-1">Duração: 2h</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <p className="font-bold text-slate-800 uppercase text-xs">Visitas Íntimas</p>
              <p className="text-sm font-medium mt-1">Segunda a Sábado</p>
              <p className="text-xs text-[#2D5016] font-bold mt-1">Duração: 2h</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <p className="font-bold text-slate-800 uppercase text-xs">Vídeochamadas</p>
              <p className="text-sm font-medium mt-1">Sábados e Domingos</p>
              <p className="text-xs text-[#2D5016] font-bold mt-1">Duração: 20 min</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
            <p className="font-black text-blue-900 uppercase text-xs tracking-widest mb-2">Limite Máximo Mensal</p>
            <div className="flex justify-center gap-6">
              <p className="text-sm text-blue-800">Sociais (Vídeo + Presencial): <strong>Até 3x/mês</strong></p>
              <p className="text-sm text-blue-800">Íntimas: <strong>Até 2x/mês</strong></p>
            </div>
          </div>
        </div>
      )
    },
    {
      question: "Qual roupa usar no dia da visita?",
      answer: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>A vestimenta obedece a um rigoroso padrão de segurança. As peças permitidas são:</p>

          <ul className="list-disc ml-5 space-y-2">
            <li><strong>Camiseta:</strong> Com manga, na cor <strong>branca</strong>.</li>
            <li><strong>Blusa:</strong> De moletom, na cor branca ou cinza claro.</li>
            <li><strong>Calça:</strong> De moletom ou tactel, na cor cinza claro.</li>
            <li><strong>Meias:</strong> Na cor branca.</li>
            <li><strong>Calçado:</strong> Sandália de borracha com solado baixo e flexível, em qualquer cor clara (exceto branca e laranja). Não pode conter fivela, tachas, enfeites ou peças metálicas.</li>
          </ul>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-gray-600 italic">
            <p>§ 1º - Camisetas e blusas femininas deverão possuir comprimento abaixo das nádegas.</p>
            <p>§ 2º - Nenhuma das peças acima pode possuir: bolso, zíper, botão, estampa, bordado, forro, capuz ou cordão.</p>
            <p>§ 3º - Fica terminantemente vedada a entrada de roupas em duplicidade (ex: vestir duas calças).</p>
          </div>

          <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-xs font-bold text-center uppercase tracking-widest">
            Não é permitido a visita no período menstrual.
          </div>
        </div>
      )
    },
    {
      question: "Quem tem direito ao estudo na unidade?",
      answer: (
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p>O acesso à educação dentro da unidade é garantido, respeitando os seguintes critérios:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>O interno deve possuir <strong>bom comportamento</strong> carcerário.</li>
            <li>As vagas abrem predominantemente no <strong>início e no meio</strong> do ano letivo.</li>
            <li>O pedido deve ser formalizado através de <strong>memorando</strong>.</li>
            <li>O envio do histórico escolar deve ser feito pela família exclusivamente através da aba <strong>"Educação"</strong> no site.</li>
          </ul>
        </div>
      )
    }
  ];

  const highlightText = (text) => {
    if (!debouncedSearch) return text;

    const regex = new RegExp(`(${debouncedSearch})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === debouncedSearch.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // 🔥 Abrir automaticamente o primeiro resultado + scroll
  useEffect(() => {
    if (filteredFaqs.length > 0 && debouncedSearch) {
      setOpenIndex(0);

      setTimeout(() => {
        firstResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 150);
    } else {
      setOpenIndex(null);
    }
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-5xl mx-auto px-6">

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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold text-[#2D5016]">
            Dúvidas Frequentes
          </h1>

          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 border border-gray-300 rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D5016]"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          {filteredFaqs.length} resultado(s) encontrado(s)
        </p>

        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div
              key={index}
              ref={index === 0 ? firstResultRef : null}
              className="bg-white shadow-md rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center px-6 py-4 text-left font-semibold text-[#2D5016]"
              >
                {highlightText(faq.question)}
                <ChevronDown
                  className={`transition-transform ${openIndex === index ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-4 text-gray-700 whitespace-pre-line"
                  >
                    {highlightText(faq.answer)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default FAQPage;