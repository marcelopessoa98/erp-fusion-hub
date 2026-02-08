
-- Tabela de propostas comerciais
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  assunto TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  consideracoes_gerais TEXT,
  consideracoes_pagamento TEXT,
  dados_bancarios JSONB DEFAULT '{}',
  validade_dias INTEGER NOT NULL DEFAULT 30,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de itens da proposta
CREATE TABLE public.proposta_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade VARCHAR(30) DEFAULT 'und',
  detalhes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies for propostas
CREATE POLICY "Users can view propostas from their filiais"
ON public.propostas FOR SELECT
USING (public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Users can create propostas"
ON public.propostas FOR INSERT
WITH CHECK (public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Users can update propostas from their filiais"
ON public.propostas FOR UPDATE
USING (public.has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Users can delete propostas from their filiais"
ON public.propostas FOR DELETE
USING (public.has_filial_access(auth.uid(), filial_id));

-- RLS policies for proposta_itens (through propostas)
CREATE POLICY "Users can view proposta_itens"
ON public.proposta_itens FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposta_id AND public.has_filial_access(auth.uid(), p.filial_id)
));

CREATE POLICY "Users can create proposta_itens"
ON public.proposta_itens FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposta_id AND public.has_filial_access(auth.uid(), p.filial_id)
));

CREATE POLICY "Users can update proposta_itens"
ON public.proposta_itens FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposta_id AND public.has_filial_access(auth.uid(), p.filial_id)
));

CREATE POLICY "Users can delete proposta_itens"
ON public.proposta_itens FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.propostas p
  WHERE p.id = proposta_id AND public.has_filial_access(auth.uid(), p.filial_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_propostas_updated_at
BEFORE UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sequência diária para numeração
CREATE OR REPLACE FUNCTION public.gerar_numero_proposta()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  hoje TEXT;
  seq INTEGER;
  numero TEXT;
BEGIN
  hoje := to_char(now(), 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(split_part(p.numero, '-', 2) AS INTEGER)
  ), 0) + 1
  INTO seq
  FROM public.propostas p
  WHERE p.numero LIKE 'C' || hoje || '-%';
  
  numero := 'C' || hoje || '-' || LPAD(seq::TEXT, 2, '0');
  RETURN numero;
END;
$$;
