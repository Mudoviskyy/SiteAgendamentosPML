import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, Send, CheckCircle2, Clock, User, Shield, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  'aberto': { label: 'Aberto', color: 'bg-blue-100 text-blue-700' },
  'em_analise': { label: 'Em Análise', color: 'bg-amber-100 text-amber-700' },
  'aguardando_visitante': { label: 'Aguardando Você', color: 'bg-rose-100 text-rose-700' },
  'resolvido': { label: 'Resolvido', color: 'bg-emerald-100 text-emerald-700' },
  'fechado': { label: 'Fechado', color: 'bg-slate-100 text-slate-700' }
};

const TicketChat = ({ ticket, user, onBack, isVisitor = true, onStatusChange }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  const isTicketClosed = ticket?.status === 'resolvido' || ticket?.status === 'fechado';

  useEffect(() => {
    fetchMessages();

    // Não cria canal Realtime para tickets já encerrados
    if (isTicketClosed) return;

    const channel = supabase.channel(`ticket_${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticket.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets',
        filter: `id=eq.${ticket.id}`
      }, (payload) => {
        if (onStatusChange) onStatusChange(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id, isTicketClosed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          remetente_id: user.id,
          mensagem: newMessage.trim(),
          is_admin: !isVisitor
        });

      if (error) throw error;

      // Atualização automática de status ao enviar mensagem
      let newStatus = ticket.status;
      const updatedAt = new Date().toISOString();

      if (!isVisitor && ticket.status !== 'fechado' && ticket.status !== 'resolvido') {
         newStatus = 'aguardando_visitante';
         await supabase.from('tickets').update({ status: newStatus, updated_at: updatedAt }).eq('id', ticket.id);
      } else if (isVisitor && ticket.status === 'aguardando_visitante') {
         newStatus = 'em_analise';
         await supabase.from('tickets').update({ status: newStatus, updated_at: updatedAt }).eq('id', ticket.id);
      }

      if (newStatus !== ticket.status && onStatusChange) {
        onStatusChange({ ...ticket, status: newStatus, updated_at: updatedAt });
      }

      setNewMessage('');
    } catch (error) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: updatedAt })
        .eq('id', ticket.id);

      if (error) throw error;

      // Update local state immediately for better UX
      if (onStatusChange) {
        onStatusChange({ ...ticket, status: newStatus, updated_at: updatedAt });
      }

      toast({ 
        title: 'Ticket Atualizado', 
        description: `O status foi alterado para: ${STATUS_CONFIG[newStatus]?.label}`,
        className: 'bg-green-600 text-white' 
      });
    } catch (error) {
       toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm relative flex-1">
      {/* Header do Chat */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between z-10 gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="md:hidden text-slate-400 hover:text-slate-600 mr-2 flex-shrink-0">
               &larr; Voltar
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-900 text-sm md:text-base break-words min-w-0" title={ticket.assunto}>{ticket.assunto}</h3>
              <Badge className={`${STATUS_CONFIG[ticket.status]?.color} border-none text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0`}>
                {STATUS_CONFIG[ticket.status]?.label || ticket.status}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex flex-wrap items-center gap-1.5 min-w-0">
               <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 flex-shrink-0">{ticket.protocolo}</span>
               <span className="text-slate-300">•</span>
               <span className="break-words min-w-0">{ticket.categoria.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* Controles de Admin */}
        {!isVisitor && !isTicketClosed && (
          <div className="flex gap-2">
             <Button size="sm" variant="outline" onClick={() => handleChangeStatus('resolvido')} className="h-8 text-[10px] font-bold uppercase tracking-widest text-emerald-600 border-emerald-200 hover:bg-emerald-50">
               Resolver
             </Button>
          </div>
        )}
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC] space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isMine = msg.remetente_id === user.id;
              
              return (
                <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 min-w-0 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-auto">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${msg.is_admin ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        {msg.is_admin ? <Shield className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    {/* Balão */}
                    <div className={`flex flex-col min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm w-full ${
                        isMine 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : msg.is_admin 
                            ? 'bg-white border border-indigo-100 rounded-bl-none text-slate-800' 
                            : 'bg-white border border-slate-100 rounded-bl-none text-slate-800'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed break-words [word-break:break-word]">{msg.mensagem}</p>
                      </div>
                      
                      {/* Meta da mensagem */}
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400 uppercase">
                        {msg.is_admin && !isMine && <span className="text-indigo-600">Suporte •</span>}
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 bg-white border-t border-slate-100 z-10">
        {isTicketClosed ? (
          <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 border border-slate-200">
            {ticket.status === 'resolvido' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Este ticket está {ticket.status}. Não é possível enviar novas mensagens.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className="flex-1 max-h-32 min-h-[50px] p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="h-[50px] w-[50px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex-shrink-0"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default TicketChat;
