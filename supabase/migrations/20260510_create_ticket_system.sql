-- Drop old table
DROP TABLE IF EXISTS public.reports_bugs CASCADE;

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocolo TEXT NOT NULL,
    visitante_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assunto TEXT NOT NULL,
    categoria TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint for status
ALTER TABLE public.tickets ADD CONSTRAINT valid_status CHECK (
    status IN ('aberto', 'em_analise', 'aguardando_visitante', 'resolvido', 'fechado')
);

-- Partial index to ensure only 1 active ticket per visitor
CREATE UNIQUE INDEX unique_active_ticket_per_visitor 
ON public.tickets (visitante_id) 
WHERE status IN ('aberto', 'em_analise', 'aguardando_visitante');

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    remetente_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mensagem TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for tickets
CREATE POLICY "Admins can view all tickets" ON public.tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE perfis.id = auth.uid() AND perfis.role = 'admin'
        )
    );

CREATE POLICY "Visitors can view their own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = visitante_id);

CREATE POLICY "Visitors can insert their own tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = visitante_id);

-- Policies for ticket_messages
CREATE POLICY "Admins can view and insert all messages" ON public.ticket_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE perfis.id = auth.uid() AND perfis.role = 'admin'
        )
    );

CREATE POLICY "Visitors can view messages of their tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_messages.ticket_id AND tickets.visitante_id = auth.uid()
        )
    );

CREATE POLICY "Visitors can insert messages to their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_messages.ticket_id AND tickets.visitante_id = auth.uid()
        ) AND remetente_id = auth.uid() AND is_admin = FALSE
    );
