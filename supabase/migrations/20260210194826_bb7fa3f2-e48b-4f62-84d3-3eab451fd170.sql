
-- Add new columns to materiais_obra
ALTER TABLE public.materiais_obra 
  ADD COLUMN IF NOT EXISTS entregue_por TEXT,
  ADD COLUMN IF NOT EXISTS recebido_por TEXT,
  ADD COLUMN IF NOT EXISTS data_entrega DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS codigo_identificacao TEXT,
  ADD COLUMN IF NOT EXISTS data_calibracao DATE;

-- Add new columns to alugueis_obra
ALTER TABLE public.alugueis_obra 
  ADD COLUMN IF NOT EXISTS entregue_por TEXT,
  ADD COLUMN IF NOT EXISTS recebido_por TEXT,
  ADD COLUMN IF NOT EXISTS data_entrega DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS codigo_identificacao TEXT,
  ADD COLUMN IF NOT EXISTS data_calibracao DATE;
