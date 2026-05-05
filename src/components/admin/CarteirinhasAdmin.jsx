import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { carteirinhasService } from '@/services/carteirinhasService';
import { addLog, measurePerf } from '@/utils/logger';
import JSZip from 'jszip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectValue, SelectTrigger
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, CheckCircle, XCircle, Eye, AlertCircle, ChevronLeft, ChevronRight, Search, FileWarning, Mail, Info, Download, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/utils/formatters';
import { getIdentificacaoLabel, getTelefoneExibivel } from '@/utils/identificacao';

const TIPOS_DOCUMENTO_LABEL = {
  foto_3x4: 'Foto 3x4',
  rg_frente: 'RG/CPF (Frente)',
  rg_verso: 'RG/CPF (Verso)',
  responsavel_rg_frente: 'RG Responsável (Frente)',
  responsavel_rg_verso: 'RG Responsável (Verso)',
  menor_rg_frente: 'RG Menor (Frente)',
  menor_rg_verso: 'RG Menor (Verso)',
  documento_oficial_com_cpf: 'Documento Identidade',
  certidao_casamento: 'Certidão Casamento/União',
  comprovante_residencia: 'Comprovante Residência',
  declaracao_residencia: 'Declaração Residência',
  declaracao_vacina: 'Declaração Vacina',
  carteirinha_oficial: 'Carteirinha Oficial',
  comprovante_parentesco: 'Comprovante Parentesco',
  certidao_nascimento: 'Certidão de Nascimento',
  documento_autorizacao_legal: 'Autorização Judicial/Guarda',
};

const formatarTipoDocumento = (tipo) => {
  return TIPOS_DOCUMENTO_LABEL[tipo] || tipo?.replaceAll('_', ' ') || 'Documento';
};

const sanitizarNomeArquivo = (nome) => {
  return String(nome || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_');
};

const normalizeCheck = (text) => {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
};

const CarteirinhasAdmin = () => {
  const [carteirinhas, setCarteirinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarteirinha, setSelectedCarteirinha] = useState(null);
  const [documentosUrls, setDocumentosUrls] = useState({});
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [cancelModal, setCancelModal] = useState({ isOpen: false, carteirinhaId: null, isRecusa: false });
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const [localStatusAdmin, setLocalStatusAdmin] = useState('neutro');
  const [localObservacaoAdmin, setLocalObservacaoAdmin] = useState('');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const [validacaoPreso, setValidacaoPreso] = useState({ loading: false, data: null });
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const fetchCarteirinhas = useCallback(async () => {
    setLoading(true);
    await measurePerf('FETCH_CARTEIRINHAS_ADMIN', async () => {
      try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('view_carteirinhas_admin')
          .select(`*, carteirinha_documentos(*)`, { count: 'exact' });

        if (filterStatus !== 'todos') {
          query = query.eq('status', filterStatus);
        }

        if (searchTerm) {
          query = query.or(
            `nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,protocolo.ilike.%${searchTerm}%`
          );
        }

        query = query
          .order('prioridade', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        let dadosProcessados = data || [];

        if (filterStatus === 'todos') {
          dadosProcessados = [...dadosProcessados].sort((a, b) => {
            const prioA = a.prioridade ?? 99;
            const prioB = b.prioridade ?? 99;
            if (prioA !== prioB) return prioA - prioB;
            return new Date(a.created_at) - new Date(b.created_at);
          });
        }

        setCarteirinhas(dadosProcessados);
        setTotalRecords(count || 0);
        addLog('ADMIN_DATA', { count: dadosProcessados.length, filter: filterStatus }, 'SUCCESS');
      } catch (error) {
        addLog('ADMIN_DATA_ERROR', { error: error.message }, 'ERROR');
        toast({
          title: 'Erro ao carregar',
          description: error.message,
          className: 'bg-red-500 text-white border-none'
        });
      } finally {
        setLoading(false);
      }
    });
  }, [page, pageSize, filterStatus, searchTerm, toast]);

  useEffect(() => {
    fetchCarteirinhas();
  }, [fetchCarteirinhas]);

  useEffect(() => {
    setPage(0);
  }, [filterStatus, searchTerm, pageSize]);

  const mensagensPadrao = [
    'A data de Emissão deve ser informada igual ao da Carteirinha Oficial.',
    'Não existe vínculo legal do interno para com o visitante.',
    'O interno informado não se encontra mais neste presídio.',
    'A declaração de vacina deve ser conforme modelo na página de solicitação da carteirinha.',
    'Documento [ ] ilegível ou com baixa qualidade.',
    'Documento [ ] vencido ou fora da validade.',
    'O documento [ ] apresentado precisa ser [...].',
    'Falta a documentação [ ] obrigatória.',
    'Foto fora do padrão exigido (3x4).',
    'O parentesco deve ser [ ] e não [ ]. O que você é da pessoa presa?',
    'Você já possui uma carteirinha i-Pen ativa enviada pelo e-mail. Use o fluxo do botão SIM na solicitação pelo portal',
    'Sua carteirinha está vencida. Solicite a renovação, envie todos os documentos necessários.',
    'Para o correto cálculo dos dias da sua carteirinha, é necessário informar a data de emissão -'

  ];

  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(true);
    addLog('CARTEIRINHA_ACTION', { id, action: newStatus }, 'INFO');

    try {
      await measurePerf(`UPDATE_STATUS_${newStatus.toUpperCase()}`, async () => {
        await carteirinhasService.updateCarteirinhaStatus(id, newStatus);
        if (newStatus === 'aprovado') {
          await apagarDocumentosCarteirinha(id);
        }
      });

      toast({
        title: `Carteirinha ${newStatus}`,
        className: 'bg-[#2D5016] text-white border-none'
      });
      fetchCarteirinhas();
      if (selectedCarteirinha?.id === id) setSelectedCarteirinha(null);
    } catch (error) {
      addLog('ACTION_ERROR', { id, error: error.message }, 'ERROR');
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        className: 'bg-red-500 text-white border-none'
      });
    }
    setActionLoading(false);
  };

  const executeCancelOrReject = async () => {
    if (!motivoCancelamento.trim()) {
      toast({
        title: 'Atenção',
        description: 'O motivo é obrigatório.',
        className: 'bg-red-500 text-white border-none'
      });
      return;
    }

    setActionLoading(true);
    const { carteirinhaId, isRecusa } = cancelModal;
    const finalStatus = isRecusa ? 'recusado' : 'cancelado';

    addLog('CARTEIRINHA_REJECTION', { id: carteirinhaId, type: finalStatus }, 'WARN');

    try {
      const { error } = await supabase
        .from('carteirinhas')
        .update({ status: finalStatus, motivo_cancelamento: motivoCancelamento })
        .eq('id', carteirinhaId);

      if (error) throw error;

      await apagarDocumentosCarteirinha(carteirinhaId);

      toast({
        title: isRecusa ? 'Carteirinha recusada' : 'Carteirinha cancelada',
        className: 'bg-[#2D5016] text-white border-none'
      });

      fetchCarteirinhas();
      setCancelModal({ isOpen: false, carteirinhaId: null, isRecusa: false });
      setMotivoCancelamento('');
      setSelectedCarteirinha(null);
    } catch (error) {
      addLog('REJECTION_ERROR', { error: error.message }, 'ERROR');
      toast({
        title: 'Erro',
        description: error.message,
        className: 'bg-red-500 text-white border-none'
      });
    }
    setActionLoading(false);
  };

  const handleSaveAdminData = async () => {
    setIsSavingAdmin(true);
    try {
      await carteirinhasService.updateCarteirinhaAdminData(
        selectedCarteirinha.id,
        localStatusAdmin,
        localObservacaoAdmin
      );
      toast({
        title: 'Dados administrativos salvos',
        className: 'bg-[#2D5016] text-white border-none'
      });
      fetchCarteirinhas();
      setSelectedCarteirinha({
        ...selectedCarteirinha,
        status_admin: localStatusAdmin,
        observacao_admin: localObservacaoAdmin
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar os dados',
        description: error.message,
        className: 'bg-red-500 text-white border-none'
      });
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const openDetails = async (carteirinha) => {
    addLog('VIEW_DETAILS', { id: carteirinha.id, protocolo: carteirinha.protocolo }, 'INFO');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Sessão expirada', description: 'Por favor, faça login novamente.' });
      return;
    }

    setSelectedCarteirinha(carteirinha);
    setLocalStatusAdmin(carteirinha.status_admin || 'neutro');
    setLocalObservacaoAdmin(carteirinha.observacao_admin || '');

    const urls = {};
    if (carteirinha.carteirinha_documentos) {
      await Promise.all(
        carteirinha.carteirinha_documentos.map(async (doc) => {
          try {
            const url = await carteirinhasService.getFileUrl(doc.url);
            if (url) {
              urls[doc.id] = url;
            } else {
              addLog('FILE_URL_MISSING', { docId: doc.id, path: doc.url }, 'WARN');
              urls[doc.id] = null;
            }
          } catch (err) {
            addLog('FILE_URL_ERROR', { docId: doc.id, path: doc.url, err: err.message }, 'ERROR');
            console.error('Erro URL:', doc.url, err);
            urls[doc.id] = null;
          }
        })
      );
    }

    setDocumentosUrls(urls);
  };

  // --- VALIDAÇÃO CONTRA BASE PDF ---
  useEffect(() => {
    const checkValidacao = async () => {
      if (selectedCarteirinha && selectedCarteirinha.matricula_preso && selectedCarteirinha.matricula_preso !== 'PENDENTE') {
        setValidacaoPreso({ loading: true, data: null });
        try {
          const { data, error } = await supabase
            .from('base_pdf')
            .select('*')
            .eq('matricula', selectedCarteirinha.matricula_preso)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const nomeAgendamento = normalizeCheck(selectedCarteirinha.nome_apenado);
            const nomeBase = normalizeCheck(data.nome);
            setValidacaoPreso({
              loading: false,
              data: { ...data, conferido: nomeAgendamento === nomeBase }
            });
          } else {
            setValidacaoPreso({ loading: false, data: null });
          }
        } catch (err) {
          console.error("Erro validacao:", err);
          setValidacaoPreso({ loading: false, data: null });
        }
      } else {
        setValidacaoPreso({ loading: false, data: null });
      }
    };
    checkValidacao();
  }, [selectedCarteirinha]);

  const apagarDocumentosCarteirinha = async (carteirinhaId) => {
    try {
      addLog('PURGE_DOCUMENTS', { id: carteirinhaId }, 'WARN');
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apagar_documentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ carteirinha_id: String(carteirinhaId) })
      });
    } catch (err) {
      addLog('PURGE_ERROR', { id: carteirinhaId, error: err.message }, 'ERROR');
      console.error('Erro ao apagar docs:', err);
    }
  };

  const handleViewDocument = (docId) => {
    const url = documentosUrls[docId];
    if (url) {
      addLog('DOCUMENT_PREVIEW', { docId }, 'INFO');
      window.open(url, '_blank');
    } else {
      toast({
        title: 'Arquivo indisponível',
        description: 'O arquivo não existe mais no servidor. Ele pode ter sido excluído após aprovação/recusa ou o upload falhou.',
        className: 'bg-red-500 text-white border-none'
      });
    }
  };

  const baixarBlob = (blob, fileName) => {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  };

  const baixarArquivoIndividual = async (doc) => {
    const url = documentosUrls[doc.id];
    if (!url) {
      throw new Error(`URL não encontrada para ${doc.nome_arquivo || doc.id}`);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar ${doc.nome_arquivo || doc.id}`);
    }

    const blob = await response.blob();
    const fileName = sanitizarNomeArquivo(doc?.nome_arquivo || `documento_${doc.id}`);
    return { blob, fileName };
  };

  const handleDownloadDocument = async (docId) => {
    const doc = selectedCarteirinha?.carteirinha_documentos?.find(d => d.id === docId);

    if (!doc) {
      toast({
        title: 'Erro',
        description: 'Documento não encontrado.',
        className: 'bg-red-500 text-white border-none'
      });
      return;
    }

    try {
      addLog('DOCUMENT_DOWNLOAD', { docId }, 'INFO');
      const { blob, fileName } = await baixarArquivoIndividual(doc);
      baixarBlob(blob, fileName);
    } catch (err) {
      addLog('DOWNLOAD_ERROR', { docId, error: err.message }, 'ERROR');
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o documento.',
        className: 'bg-red-500 text-white border-none'
      });
    }
  };

  const handleDownloadAllDocumentsZip = async () => {
    const docs = selectedCarteirinha?.carteirinha_documentos || [];

    if (!docs.length) {
      toast({
        title: 'Nenhum documento',
        description: 'Não há documentos para baixar.',
        className: 'bg-red-500 text-white border-none'
      });
      return;
    }

    setIsDownloadingZip(true);
    setZipProgress(0);
    try {
      addLog('DOCUMENT_DOWNLOAD_ALL_ZIP', { carteirinhaId: selectedCarteirinha?.id, total: docs.length }, 'INFO');

      const zip = new JSZip();
      const total = docs.length;
      let processed = 0;

      for (const doc of docs) {
        const { blob, fileName } = await baixarArquivoIndividual(doc);
        const nomePasta = formatarTipoDocumento(doc.tipo_documento);
        zip.folder(nomePasta)?.file(fileName, blob);
        
        processed++;
        // Reserva 90% do progresso para o download dos arquivos
        setZipProgress((processed / total) * 90);
      }

      // Os últimos 10% são para a geração do ZIP final
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setZipProgress(90 + (metadata.percent * 0.1));
      });

      const protocolo = sanitizarNomeArquivo(selectedCarteirinha?.protocolo || 'documentos');
      baixarBlob(zipBlob, `${protocolo}_documentos.zip`);

      toast({
        title: 'ZIP gerado com sucesso',
        description: 'Todos os documentos foram baixados em um único arquivo.',
        className: 'bg-[#2D5016] text-white border-none'
      });
    } catch (err) {
      addLog('DOWNLOAD_ALL_ZIP_ERROR', { error: err.message }, 'ERROR');
      toast({
        title: 'Erro ao gerar ZIP',
        description: err.message || 'Não foi possível baixar os documentos em ZIP.',
        className: 'bg-red-500 text-white border-none'
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'aprovado':
        return <Badge className="bg-[#2D5016] text-white border-none uppercase text-[10px] font-black">Aprovado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500 text-white border-none uppercase text-[10px] font-black">Pendente</Badge>;
      case 'recusado':
        return <Badge className="bg-red-600 text-white border-none uppercase text-[10px] font-black">Recusado</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-800 text-white border-none uppercase text-[10px] font-black">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoSolicitacaoBadge = (tipo) => {
    if (tipo === 'nova') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">1ª Via (Nova)</Badge>;
    }
    if (tipo === 'renovacao') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Renovação</Badge>;
    }
    if (tipo === true || String(tipo) === 'true' || tipo === 'sim') {
      return <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Já Tenho</Badge>;
    }
    if (tipo === 'nao') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Solicitação (Legado)</Badge>;
    }
    return null;
  };

  const getRowStyle = (carteirinha) => {
    if (carteirinha.status !== 'pendente') return 'hover:bg-gray-50/50';

    // Menor de idade pendente tem destaque especial
    if (carteirinha.menor_idade) return 'bg-pink-50 hover:bg-pink-100/70 border-l-4 border-l-pink-500';

    switch (carteirinha.status_admin) {
      case 'em_analise': return 'bg-yellow-100/50 hover:bg-yellow-200/50 border-l-4 border-l-yellow-400';
      case 'falta_memorando': return 'bg-red-100/50 hover:bg-red-200/50 border-l-4 border-l-red-500';
      case 'aguardando_ipen': return 'bg-orange-100/50 hover:bg-orange-200/50 border-l-4 border-l-orange-500';
      case 'liberado': return 'bg-green-100/50 hover:bg-green-200/50 border-l-4 border-l-green-500';
      case 'bloqueado': return 'bg-slate-200/50 hover:bg-slate-300/50 border-l-4 border-l-slate-600';
      default: return 'hover:bg-gray-50/50 border-l-4 border-transparent';
    }
  };

  const STATUS_ADMIN_LABELS = {
    neutro: 'Neutro',
    em_analise: 'Em Análise',
    falta_memorando: 'Falta Memorando',
    aguardando_ipen: 'Aguardando I-Pen',
    liberado: 'Liberado',
    bloqueado: 'Bloqueado'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome, CPF ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-white text-gray-900 border-gray-200"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] bg-white text-gray-900 border-gray-200">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="recusado">Recusados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Primeira Linha: Azul e Vermelho (Já existentes) */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-3 flex items-center gap-3 bg-blue-50 border-r border-gray-100">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-900">
              Antes de <strong>APROVAR</strong> uma carteirinha, use o botão <span className="font-bold underline">detalhes</span> para ver os dados complementares e baixar os documentos.
            </p>
          </div>
          <div className="flex-1 p-3 flex items-center gap-3 bg-red-50">
            <FileWarning className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-bold text-red-700 uppercase">
              Após aprovar, cancelar ou recusar, os arquivos serão permanentemente apagados!
            </p>
          </div>
        </div>

        {/* Segunda Linha: Verde e Amarelo (Novas informações) */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">
          {/* Card Verde - Esquerda */}
          <div className="flex-1 p-3 flex items-center gap-3 bg-emerald-50 border-r border-gray-100">
            <Search className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-900">
              <span className="font-bold uppercase text-[10px] block text-emerald-700">Passo 1</span>
              Primeira ação do servidor: verificar <strong>CPF</strong> e <strong>NOME</strong> para certificar existência de carteirinha.
            </p>
          </div>

          {/* Card Amarelo - Direita */}
          <div className="flex-1 p-3 flex items-center gap-3 bg-amber-50">
            <Mail className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-bold uppercase text-[10px] block text-amber-700">Finalização</span>
              Última coisa a fazer é <strong>aprovar</strong> a carteirinha. Aprove depois de ter enviado a carteirinha oficial através do e-mail.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Tipos de Solicitação:</span>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">1ª Via (Nova)</Badge>
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Renovação</Badge>
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Já Tenho</Badge>
          <Badge className="bg-pink-500 text-white border-pink-600 hover:bg-pink-500 text-[9px] px-1.5 py-0 uppercase font-black tracking-wider shadow-sm">Menor - TEM PRIORIDADE NA APROVAÇÃO</Badge>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold text-gray-700">Visitante / Protocolo</TableHead>
              <TableHead className="font-bold text-gray-700">Documento</TableHead>
              <TableHead className="font-bold text-gray-700">Solicitação</TableHead>
              <TableHead className="font-bold text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-gray-700">Observações</TableHead>
              <TableHead className="text-right font-bold text-gray-700">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto text-[#2D5016]" />
                </TableCell>
              </TableRow>
            ) : carteirinhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              carteirinhas.map((c) => (
                <TableRow
                  key={c.id}
                  className={`transition-colors ${getRowStyle(c)}`}
                >
                  <TableCell className="align-middle py-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {c.nome}
                      {c.menor_idade && (
                        <Badge className="bg-pink-500 text-white border-none text-[8px] h-4 px-1.5 font-black uppercase shadow-sm">Menor</Badge>
                      )}
                      {c.protocolo?.startsWith('VIN-') && (
                        <Badge className="bg-blue-600 text-white border-none text-[8px] h-4 px-1 font-black">VÍNCULO</Badge>
                      )}
                    </div>
                    {c.menor_idade && c.nome_menor && (
                      <div className="text-[10px] text-pink-700 font-bold mt-0.5">Menor: {c.nome_menor}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">ID: {c.protocolo}</div>
                      {getTipoSolicitacaoBadge(c.possui_carteirinha)}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle py-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      {getIdentificacaoLabel(c.tipo_identificacao)}
                    </span>
                    <span className="font-medium text-gray-600">{c.cpf}</span>
                  </TableCell>
                  <TableCell className="align-middle py-4 text-xs">
                    <div className="text-gray-900 font-medium">{format(new Date(c.created_at), 'dd/MM/yyyy')}</div>
                    <div className="text-gray-400">{format(new Date(c.created_at), 'HH:mm')}</div>
                    {c.status === 'pendente' && (
                      <div className="mt-1">
                        <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-sm border border-orange-100 font-bold text-[9px] animate-pulse">
                          {(() => {
                            const dias = Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24));
                            return dias === 0 ? 'HOJE' : `HÁ ${dias} DIAS`;
                          })()}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-middle py-4">{getStatusBadge(c.status)}</TableCell>
                  <TableCell className="align-middle py-4 max-w-[200px]">
                    {c.validade && (
                      <div className="text-[10px] text-green-700 font-bold uppercase">
                        Val: {formatDate(c.validade)}
                      </div>
                    )}
                    <div className="text-[10px] text-red-600 italic whitespace-normal break-words leading-tight">
                      {c.motivo_cancelamento}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-middle py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(c)}
                      className="text-blue-600 border-blue-100 hover:bg-blue-50 text-[10px] font-bold uppercase"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500">
          Total: <span className="text-gray-900 font-bold">{totalRecords}</span> solicitações
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-[#2D5016] bg-green-50 px-3 py-1 rounded-md border border-green-100">
            Página {page + 1} de {Math.ceil(totalRecords / pageSize) || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalRecords || loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
          <SelectTrigger className="w-[80px] h-8 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={!!selectedCarteirinha} onOpenChange={(open) => !open && setSelectedCarteirinha(null)}>
        <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border-0 p-6">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-[#2D5016] flex items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2"><Eye className="w-5 h-5" /> Detalhes da Solicitação</span>
              <div className="flex items-center gap-2">
                {getTipoSolicitacaoBadge(selectedCarteirinha?.possui_carteirinha)}
                {selectedCarteirinha?.protocolo?.startsWith('VIN-') && (
                  <Badge className="bg-blue-600 text-white border-none uppercase text-[10px] font-black">Solicitação de Vínculo</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCarteirinha && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-green-700 mb-2 border-b border-green-200 pb-1 flex justify-between items-center">
                      <span>Dados do Visitante</span>
                      {selectedCarteirinha.created_at && (
                        <span className="text-[9px] font-medium lowercase italic">Solicitado em: {format(new Date(selectedCarteirinha.created_at), 'dd/MM/yy HH:mm')}</span>
                      )}
                    </h4>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-green-600/70 uppercase tracking-widest mb-1">Visitante / Requerente</p>
                      <p className="font-black text-gray-900 uppercase text-lg leading-tight mb-4">
                        {selectedCarteirinha.nome}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-green-600/70 uppercase tracking-wider">{getIdentificacaoLabel(selectedCarteirinha.tipo_identificacao)}</p>
                          <p className="text-sm font-bold text-gray-700">{selectedCarteirinha.cpf}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-green-600/70 uppercase tracking-wider">Parentesco</p>
                          <p className="text-sm font-bold text-gray-700 uppercase">{selectedCarteirinha.parentesco}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-green-600/70 uppercase tracking-wider">Contato</p>
                          <p className="text-sm font-bold text-green-700 flex items-center gap-1">
                            {getTelefoneExibivel(selectedCarteirinha.telefone, selectedCarteirinha.tipo_telefone)}
                          </p>
                        </div>
                        {selectedCarteirinha.data_emissao && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-green-600/70 uppercase tracking-wider">Emissão Informada</p>
                            <p className="text-sm font-bold text-gray-700">{formatDate(selectedCarteirinha.data_emissao)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedCarteirinha.ip_address && (
                    <div className="mt-4 border-t border-green-200 pt-2 flex items-center justify-between">
                      <p className="text-[10px] text-green-600/50 font-mono flex items-center gap-1">
                        <span className="bg-green-100 px-1 rounded text-[8px] font-black uppercase border border-green-200">IP Origem:</span>
                        {selectedCarteirinha.ip_address}
                      </p>
                      <span className="text-[9px] text-green-600/40 font-bold uppercase tracking-tighter">Site Oficial PML</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1">
                      Vínculo Carcerário
                    </h4>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Interno / Apenado</p>
                        <p className="font-black text-gray-900 uppercase text-lg leading-tight flex flex-wrap items-center gap-2">
                          {selectedCarteirinha?.nome_apenado}
                          {selectedCarteirinha?.matricula_preso && (
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-black shadow-sm">
                              {selectedCarteirinha.matricula_preso}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Resultado da Validação PDF */}
                      <div className="shrink-0 flex flex-col items-end">
                        {validacaoPreso.loading ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> Validando...
                          </div>
                        ) : validacaoPreso.data ? (
                          validacaoPreso.data.conferido ? (
                            <div className="bg-green-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md border-2 border-green-500">
                              <ShieldCheck size={24} className="shrink-0" />
                              <div className="text-left">
                                <p className="text-xs font-black uppercase leading-none tracking-tight">Conferido</p>
                                <p className="text-[10px] opacity-90 leading-none mt-1 font-bold">Base i-PEN {validacaoPreso.data.galeria}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-100 border-2 border-amber-300 text-amber-900 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md max-w-[240px]">
                              <AlertCircle size={24} className="shrink-0 text-amber-600" />
                              <div className="text-left">
                                <p className="text-xs font-black uppercase leading-none tracking-tight">Nome Divergente</p>
                                <p className="text-[10px] leading-tight mt-1.5 font-bold uppercase">No PDF consta: <span className="text-amber-700">{validacaoPreso.data.nome}</span></p>
                              </div>
                            </div>
                          )
                        ) : selectedCarteirinha?.matricula_preso && selectedCarteirinha.matricula_preso !== 'PENDENTE' ? (
                          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-md max-w-[240px]">
                            <XCircle size={24} className="shrink-0 text-red-600" />
                            <div className="text-left">
                              <p className="text-xs font-black uppercase leading-none tracking-tight">Não encontrado</p>
                              <p className="text-[10px] leading-tight mt-1.5 font-bold italic">Matrícula não localizada na Unidade.</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2">
                      {(!selectedCarteirinha?.matricula_preso || selectedCarteirinha?.matricula_preso === 'PENDENTE') ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1 leading-tight">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Matrícula Pendente
                          </p>
                          <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                            {selectedCarteirinha?.protocolo?.startsWith('VIN-')
                              ? 'Este vínculo foi solicitado como 1ª Via. O visitante informará a matrícula no próximo agendamento, e o banco será atualizado automaticamente.'
                              : 'A matrícula será atualizada pelo visitante no primeiro agendamento.'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-wider">
                          Matrícula Registrada (IPEN)
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 border-t border-gray-200 pt-2">Protocolo: {selectedCarteirinha.protocolo}</p>
                </div>

                {/* Dados do Menor de Idade */}
                {selectedCarteirinha?.menor_idade && (
                  <div className="p-4 bg-pink-50 rounded-xl border border-pink-200 md:col-span-2">
                    <h4 className="text-[10px] font-bold uppercase text-pink-700 mb-2 border-b border-pink-200 pb-1 flex items-center gap-2">
                      <span className="bg-pink-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black">MENOR</span>
                      Dados do Menor de Idade
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-pink-500 uppercase">Nome do Menor</p>
                        <p className="font-bold text-gray-900">{selectedCarteirinha.nome_menor || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-pink-500 uppercase">Data de Nascimento</p>
                        <p className="font-bold text-gray-900">{selectedCarteirinha.data_nascimento_menor ? formatDate(selectedCarteirinha.data_nascimento_menor) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-pink-500 uppercase">CPF do Menor</p>
                        <p className="font-bold text-gray-900">{selectedCarteirinha.cpf_menor || <span className="text-gray-400 italic text-xs">Não informado</span>}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedCarteirinha.status === 'pendente' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-3 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Acompanhamento Administrativo</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Status Admin</label>
                      <Select value={localStatusAdmin} onValueChange={setLocalStatusAdmin}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="neutro">⚪ Neutro</SelectItem>
                          <SelectItem value="em_analise">🟡 Em Análise</SelectItem>
                          <SelectItem value="falta_memorando">🔴 Falta Memorando</SelectItem>
                          <SelectItem value="aguardando_ipen">🟠 Aguardando I-Pen</SelectItem>
                          <SelectItem value="liberado">🟢 Liberado</SelectItem>
                          <SelectItem value="bloqueado">⚫ Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Observações Internas</label>
                      <Textarea
                        placeholder="Detalhes administrativos não visíveis ao visitante..."
                        value={localObservacaoAdmin}
                        onChange={(e) => setLocalObservacaoAdmin(e.target.value)}
                        className="bg-white min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSaveAdminData}
                      disabled={isSavingAdmin}
                    >
                      {isSavingAdmin ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                      Salvar Acompanhamento
                    </Button>
                  </div>
                </div>
              )}

              {selectedCarteirinha.carteirinha_documentos?.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Documentação Digitalizada</h4>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-700 border-green-200 hover:bg-green-50 text-xs font-bold"
                      onClick={handleDownloadAllDocumentsZip}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Baixar tudo em ZIP
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const documentosAgrupados = selectedCarteirinha.carteirinha_documentos.reduce((acc, doc) => {
                        const tipo = doc.tipo_documento || 'Outros';
                        if (!acc[tipo]) acc[tipo] = [];
                        acc[tipo].push(doc);
                        return acc;
                      }, {});

                      return Object.entries(documentosAgrupados).map(([tipo, arquivos]) => (
                        <div key={tipo} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-[10px] text-gray-900 uppercase mb-2">
                            {formatarTipoDocumento(tipo)}
                          </h4>

                          <div className="space-y-2">
                            {arquivos.map((doc) => {
                              const fileAvailable = documentosUrls[doc.id] != null;
                              return (
                              <div key={doc.id} className={`rounded-md border p-2 ${fileAvailable ? 'border-gray-100' : 'border-red-200 bg-red-50'}`}>
                                <p className="text-[11px] text-gray-600 truncate mb-2">{doc.nome_arquivo}</p>
                                {!fileAvailable && (
                                  <p className="text-[10px] text-red-600 font-bold mb-2 flex items-center gap-1">
                                    <FileWarning className="w-3 h-3" /> Arquivo indisponível no servidor
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`flex-1 text-xs ${fileAvailable ? 'text-blue-600 border-blue-200 hover:bg-blue-50' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                    onClick={() => handleViewDocument(doc.id)}
                                    disabled={!fileAvailable}
                                  >
                                    <Eye className="w-3 h-3 mr-1" /> Ver
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`flex-1 text-xs ${fileAvailable ? 'text-green-700 border-green-200 hover:bg-green-50' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                    onClick={() => handleDownloadDocument(doc.id)}
                                    disabled={!fileAvailable}
                                  >
                                    <Download className="w-3 h-3 mr-1" /> Baixar
                                  </Button>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <div className="border-t pt-6 flex justify-end gap-3">
                {selectedCarteirinha?.status?.toLowerCase() === 'pendente' && (
                  <>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => setCancelModal({ isOpen: true, carteirinhaId: selectedCarteirinha.id, isRecusa: true })}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Recusar
                    </Button>
                    <Button
                      className="bg-[#2D5016] hover:bg-[#1f3810] text-white min-w-[150px]"
                      onClick={() => handleStatusUpdate(selectedCarteirinha.id, 'aprovado')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Aprovar Agora
                    </Button>
                  </>
                )}

                {selectedCarteirinha?.status?.toLowerCase() === 'aprovado' && (
                  <Button
                    variant="destructive"
                    className="bg-red-800 hover:bg-red-900 text-white"
                    onClick={() => setCancelModal({ isOpen: true, carteirinhaId: selectedCarteirinha.id, isRecusa: false })}
                    disabled={actionLoading}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" /> Cancelar Carteirinha Ativa
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelModal.isOpen}
        onOpenChange={(open) => !open && setCancelModal({ isOpen: false, carteirinhaId: null, isRecusa: false })}
      >
        <DialogContent className="bg-white p-6 rounded-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {cancelModal.isRecusa ? 'Recusar Carteirinha' : 'Cancelar Carteirinha'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600 italic">Descreva o motivo que será enviado ao visitante:</p>

            <div className="flex flex-wrap gap-2">
              {mensagensPadrao.map((msg, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setMotivoCancelamento(prev => (prev ? prev + ' ' + msg : msg))}
                  className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                >
                  {msg}
                </button>
              ))}
            </div>

            <Input
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Ex: Foto de baixa qualidade ou documento expirado"
              className="bg-gray-50 border-gray-200 text-gray-900"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelModal({ isOpen: false })}>
              Voltar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={executeCancelOrReject}
              disabled={!motivoCancelamento.trim() || actionLoading}
            >
              {actionLoading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay de Download ZIP */}
      {isDownloadingZip && (
        <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 max-w-xs text-center animate-in zoom-in duration-300">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-[#2D5016] animate-spin opacity-20" />
              <Download className="w-8 h-8 text-[#2D5016] absolute animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Preparando ZIP</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
                Compactando documentos...<br/>Aguarde o download iniciar.
              </p>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2 border border-gray-200 p-[1px]">
              <div 
                className="bg-[#2D5016] h-full rounded-full transition-all duration-300 ease-out flex items-center justify-end px-1"
                style={{ width: `${zipProgress}%` }}
              >
                <div className="w-1 h-1 bg-white/40 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-[10px] font-black text-[#2D5016] tracking-tighter">
              {zipProgress < 100 ? `${Math.round(zipProgress)}%` : 'CONCLUÍDO!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarteirinhasAdmin;