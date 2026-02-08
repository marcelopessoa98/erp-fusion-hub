
-- Add name-based elaborado_por and aprovado_por_nome columns
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS elaborado_por TEXT;
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS aprovado_por_nome TEXT;

-- Update status values: simplify from CEO workflow to simple rascunho/aprovada/enviada/cancelada
-- Update existing rows
UPDATE public.propostas SET status = 'aprovada' WHERE status = 'aprovada_ceo';
UPDATE public.propostas SET status = 'pendente' WHERE status = 'aguardando_ceo';
