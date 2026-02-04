-- Adicionar coluna de referência na tabela obras
ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS referencia text;