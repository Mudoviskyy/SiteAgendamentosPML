import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, UserCheck, Camera, Users, ShieldCheck, Lightbulb } from 'lucide-react';

const OrientacoesModal = ({ infoModalType, setInfoModalType }) => {
  return (
    <Dialog open={!!infoModalType} onOpenChange={(open) => !open && setInfoModalType(null)}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`text-base font-bold uppercase ${infoModalType === 'menor' ? 'text-pink-600' : 'text-[#2D5016]'}`}>
            Orientações para {infoModalType === 'presencial' ? 'Visitação Presencial' : infoModalType === 'video' ? 'Vídeo Chamada' : infoModalType === 'intima' ? 'Visita Íntima' : 'Visita com Menores'}
          </DialogTitle>
        </DialogHeader>

        {/* CONTEÚDO PRESENCIAL */}
        {infoModalType === 'presencial' && (
          <div className="text-sm text-gray-700 space-y-4">
            <p>Sua visita social foi agendada para a data e horário informados na tarja (Próxima Visita Agendada). Siga atentamente as orientações abaixo:</p>
            <p>⏰ <strong>Comparecer com pelo menos 1h30 de antecedência.</strong></p>
            <p>📄 <strong>Obrigatório:</strong> Documento com foto + carteirinha de visitação <strong>IMPRESSA</strong>.</p>
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs space-y-2">
              <p className="font-bold text-red-700">ATENÇÃO</p>
              <p>• É responsabilidade do visitante verificar a validade da carteirinha.</p>
              <p>• Não será permitida visita com carteirinha vencida.</p>
              <p>• A carteirinha deve estar vinculada ao interno.</p>
              <p>• Para o uso dos armários é necessário levar um cadeado pequeno (LT 20 ou 30).</p>
              <p className="font-bold">Não serão reagendadas visitas por inconformidade.</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">Vestimentas permitidas:</p>
              <ul className="list-disc ml-5 space-y-1 text-xs">
                <li>Camiseta branca com manga</li>
                <li>Moletom branco ou cinza claro</li>
                <li>Calça moletom ou tactel cinza claro</li>
                <li>Meias brancas</li>
                <li>Sandália de borracha clara (exceto branca e laranja)</li>
              </ul>
            </div>
            <div className="text-xs space-y-1 text-gray-600">
              <p><strong>Regras adicionais:</strong></p>
              <p>• Roupas sem bolso, zíper, botão ou estampa</p>
              <p>• Comprimento abaixo das nádegas</p>
              <p>• Proibido roupas duplicadas</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs">
              <p className="font-bold text-yellow-800">Proibições:</p>
              <p>• Estado de embriaguez</p>
              <p>• Falta de higiene</p>
              <p>• Uso de absorvente íntimo</p>
            </div>
            <p className="text-[10px] text-gray-500 pt-2">(Portaria 1057 de 11 de agosto de 2022)</p>
          </div>
        )}

        {/* CONTEÚDO VÍDEO CHAMADA */}
        {infoModalType === 'video' && (
          <div className="text-sm text-gray-700 space-y-4">
            <p>Sua vídeo chamada ficou agendada para a data e período informado na tarja (Próxima Visita Agendada).</p>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs space-y-2">
              <p className="font-bold text-red-700">Atenção!</p>
              <p><strong>NÃO É autorizado</strong> o compartilhamento de vídeo chamada no momento da visita virtual e na ocorrência de ligação em grupo a visita será imediatamente interrompida, podendo gerar suspensão.</p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <p>Agora é possível até 3 pessoas participarem da mesma visita virtual, desde que estejam previamente agendadas e possuam carteira de visita.</p>
              <p>A vídeo chamada poderá acontecer um pouco antes ou um pouco depois do horário pré-agendado.</p>
            </div>

            <p className="text-[10px] text-gray-500 pt-2">(Portaria 1057 de 11 de agosto de 2022)</p>
          </div>
        )}

        {/* CONTEÚDO VISITA ÍNTIMA */}
        {infoModalType === 'intima' && (
          <div className="text-sm text-gray-700 space-y-4">
            <p>Sua visita íntima foi agendada para o dia e horário informados na tarja (Próxima Visita Agendada), seguir o padrão abaixo:</p>
            <p>⏰ <strong>É necessário que a visita esteja na Unidade Prisional com pelo menos 1h30min antes da visita marcada.</strong></p>
            <p>📄 <strong>OBS.:</strong> Trazer um documento atual com foto e a carteirinha de visitação <strong>IMPRESSA</strong>.</p>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs space-y-2">
              <p className="font-black text-red-700 uppercase">Atenção!</p>
              <p>• É de total responsabilidade do visitante o cuidado da validade de sua carteira de visitação, sendo que não será permitida a visita caso a carteira esteja vencida.</p>
              <p>• A carteira de visitante deve estar vinculada com o interno da visita agendada. Não serão permitidas visitas para internos que não estejam vinculados no sistema.</p>
              <p>• Para o uso dos armários é necessário levar um cadeado pequeno (LT 20 ou 30).</p>
              <p className="font-bold text-red-800 uppercase mt-2 pt-2 border-t border-red-200">
                Não é de responsabilidade do setor social fazer a conferência. Não serão reagendadas visitas não realizadas por conta de inconformidade de carteira de visita.
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-800">Seção III - Das Vestimentas (Art. 131)</p>
              <p className="text-xs mb-1">Somente poderão ingressar no estabelecimento penal para realizar visitas aos presos, homens e mulheres que estiverem utilizando as seguintes vestimentas:</p>
              <ul className="list-disc ml-5 space-y-1 text-xs text-gray-600">
                <li>Camiseta com manga, na cor branca;</li>
                <li>Blusa de moletom, na cor branca ou cinza claro (sugestão);</li>
                <li>Calça de moletom, ou de tactel, na cor cinza claro;</li>
                <li>Meias na cor branca;</li>
                <li>Sandália de borracha com solado baixo e flexível, em qualquer cor clara, exceto nas cores branca e laranja.</li>
              </ul>
              <div className="text-[11px] mt-2 space-y-1 text-gray-500 italic">
                <p>§ 1º Camisetas e blusas femininas deverão possuir comprimento abaixo das nádegas;</p>
                <p>§ 2º Os itens previstos não poderão possuir bolso, zíper, botão, estampa, bordado, forro, capuz e cordão;</p>
                <p>§ 3º Fica vedada a entrada de roupas em duplicidade.</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs">
              <p className="font-bold text-yellow-800">Proibições (Art. 126):</p>
              <p>• Visível estado de embriaguez;</p>
              <p>• Falta de higiene pessoal apropriada;</p>
              <p>• Utilizando absorvente íntimo (interno ou externo).</p>
            </div>

            <div>
              <p className="font-bold text-slate-800">Itens Permitidos (Art. 164)</p>
              <p className="text-xs mb-1">O cônjuge poderá ingressar com os seguintes itens:</p>
              <ul className="list-disc ml-5 space-y-1 text-xs text-gray-600">
                <li>03 (três) preservativos;</li>
                <li>01 (um) sabonete líquido transparente;</li>
                <li>01 (um) rolo de papel higiênico;</li>
                <li>01 (uma) toalha de banho na cor BRANCA sem desenho;</li>
                <li>01 (um) lençol de cor BRANCA sem desenho;</li>
                <li>01 (uma) manta sem costura e forro, tipo soft de cores claras e sem desenhos;</li>
                <li>01 (uma) garrafa de água transparente.</li>
              </ul>
              <p className="text-[11px] mt-2 text-gray-500 italic">
                Art. 165. Os itens autorizados serão inspecionados na presença do visitante.<br />
                Art. 166. São vedados o ingresso e o retorno do preso da sala de visitação conjugal portando quaisquer objetos.
              </p>
            </div>

            <p className="text-[10px] text-gray-500 pt-2">(Portaria 1057 de 11 de agosto de 2022)</p>
          </div>
        )}

        {/* CONTEÚDO VISITA COM MENORES */}
        {infoModalType === 'menor' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-600 leading-relaxed">
                Para solicitar a carteirinha de visita para crianças ou adolescentes, é fundamental observar as regras de segurança e a documentação obrigatória exigida pela Polícia Penal de SC.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* QUEM PODE PEDIR */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Quem pode pedir?</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A visita de menores é restrita apenas para:
                  <span className="block mt-1 font-bold text-slate-900">• Filhos e Enteados</span>
                  <span className="block font-bold text-slate-900">• Netos e Irmãos</span>
                </p>
              </div>

              {/* DOCUMENTOS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Documentos (Fotos)</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Tenha em mãos as fotos nítidas de:
                  <span className="block mt-1">• RG ou Certidão do Menor</span>
                  <span className="block">• Foto do rosto (fundo branco)</span>
                  <span className="block">• Comprovante de endereço</span>
                </p>
              </div>

              {/* ACOMPANHANTE */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-orange-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Regras de Entrada</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  O menor <strong>nunca</strong> entra sozinho. O acompanhante deve ter cadastro ativo. Se não for pai/mãe, precisa de autorização do cartório.
                </p>
              </div>

              {/* SEGURANÇA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Revista Segura</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A revista em crianças é apenas nos pertences e <strong>somente visual</strong>. É proibida qualquer revista íntima em menores.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="flex-1 bg-cyan-600 text-white p-4 rounded-xl flex items-center gap-4 shadow-lg shadow-cyan-100">
                <Clock className="w-6 h-6 opacity-50 shrink-0" />
                <div>
                  <h5 className="font-black uppercase text-[9px] tracking-wider opacity-80">Prazo de Entrega</h5>
                  <p className="text-xs font-bold">20 dias após aprovado</p>
                </div>
              </div>
              <div className="flex-1 bg-yellow-100 border border-yellow-200 p-4 rounded-xl flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-yellow-600 shrink-0" />
                <p className="text-[10px] text-yellow-900 leading-tight">
                  <strong>DICA:</strong> Fotos ruins ou cortadas causam cancelamento na hora. Capriche na foto!
                </p>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center pt-2 italic">Informações conforme Portaria nº 2189/GABS/SEJURI/2025</p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setInfoModalType(null)} className="bg-[#2D5016] hover:bg-[#1f3a0f] text-white">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrientacoesModal;
