-- Adicionar coluna obra_id na tabela horas_extras
ALTER TABLE public.horas_extras 
ADD COLUMN obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL;