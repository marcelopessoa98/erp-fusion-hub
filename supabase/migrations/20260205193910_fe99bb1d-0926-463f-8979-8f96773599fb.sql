-- Tabela para materiais em obra (relação N:N com quantidades)
CREATE TABLE public.materiais_obra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  UNIQUE(obra_id, material_id)
);

-- Enable RLS
ALTER TABLE public.materiais_obra ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view materiais_obra of their filiais"
ON public.materiais_obra
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = materiais_obra.obra_id
    AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), o.filial_id))
  )
);

CREATE POLICY "Authenticated users can manage materiais_obra"
ON public.materiais_obra
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = materiais_obra.obra_id
    AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), o.filial_id))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_materiais_obra_updated_at
BEFORE UPDATE ON public.materiais_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para alugueis em obra (mesma lógica)
CREATE TABLE public.alugueis_obra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0,
  data_saida date NOT NULL DEFAULT CURRENT_DATE,
  data_previsao_retorno date,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  UNIQUE(obra_id, material_id)
);

-- Enable RLS
ALTER TABLE public.alugueis_obra ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view alugueis_obra of their filiais"
ON public.alugueis_obra
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = alugueis_obra.obra_id
    AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), o.filial_id))
  )
);

CREATE POLICY "Authenticated users can manage alugueis_obra"
ON public.alugueis_obra
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = alugueis_obra.obra_id
    AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), o.filial_id))
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_alugueis_obra_updated_at
BEFORE UPDATE ON public.alugueis_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();