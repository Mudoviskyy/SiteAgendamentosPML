import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, LifeBuoy, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = [
  { id: 'duvida', label: 'Dúvida Técnica' },
  { id: 'problema_tecnico', label: 'Problema Técnico / Erro' },
  { id: 'sugestao', label: 'Sugestão de Melhoria' },
  { id: 'outro', label: 'Outro Assunto' }
];

const NovoTicketModal = ({ isOpen, onClose, onTicketCreated, user, profile }) => {
  const [assunto, setAssunto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assunto.trim() || !categoria || !mensagem.trim()) {
      toast({ title: 'Atenção', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Gerar protocolo TKT-YYYY-XXXX
      const ano = new Date().getFullYear();
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      const protocolo = `TKT-${ano}-${randomChars}`;

      // Inserir Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          protocolo,
          visitante_id: user.id,
          nome_visitante: profile?.nome || 'Visitante',
          assunto: assunto.trim(),
          categoria,
          status: 'aberto'
        })
        .select()
        .single();

      if (ticketError) {
        if (ticketError.code === '23505') { // Unique violation
            throw new Error('Você já possui um ticket em andamento. Aguarde a resolução antes de abrir outro.');
        }
        throw ticketError;
      }

      // Inserir Mensagem Inicial
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          remetente_id: user.id,
          mensagem: mensagem.trim(),
          is_admin: false
        });

      if (msgError) throw msgError;

      toast({
        title: 'Ticket Criado!',
        description: `Seu chamado ${protocolo} foi aberto com sucesso.`,
        className: 'bg-green-600 text-white'
      });
      
      // Reset state
      setAssunto('');
      setCategoria('');
      setMensagem('');
      
      onTicketCreated(ticket);
      onClose();

    } catch (error) {
      toast({ 
        title: 'Erro ao abrir chamado', 
        description: error.message || 'Ocorreu um erro inesperado.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white p-6 md:p-8 rounded-[24px] w-full max-w-lg shadow-2xl border border-white/20 relative">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="bg-indigo-100 p-3 rounded-2xl">
            <LifeBuoy className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Novo Chamado</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Descreva o que você precisa</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Assunto Breve
            </label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              maxLength={60}
              placeholder="Ex: Problema ao carregar foto"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none placeholder:font-normal"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none"
              disabled={isSubmitting}
            >
              <option value="" disabled>Selecione uma categoria...</option>
              {CATEGORIAS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5 ml-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Descrição Detalhada
              </label>
              <span className={`text-[10px] font-bold ${mensagem.length > 800 ? 'text-red-500' : 'text-slate-400'}`}>
                {mensagem.length}/1000
              </span>
            </div>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={1000}
              placeholder="Descreva todos os detalhes para que possamos ajudar da melhor forma..."
              className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium outline-none resize-none placeholder:font-normal"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !assunto.trim() || !categoria || !mensagem.trim() || mensagem.length < 10}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
                </>
              ) : (
                'Abrir Chamado'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovoTicketModal;
