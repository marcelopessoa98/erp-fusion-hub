-- Adicionar coluna data_nascimento na tabela funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN data_nascimento date;

-- Criar tabela para tipos de não conformidades
CREATE TABLE public.tipos_nc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('funcionario', 'cliente')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tipos_nc ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Authenticated users can view tipos_nc" 
ON public.tipos_nc 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and gerentes can manage tipos_nc" 
ON public.tipos_nc 
FOR ALL 
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'gerente'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_tipos_nc_updated_at
BEFORE UPDATE ON public.tipos_nc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna tipo_nc_id na tabela nao_conformidades
ALTER TABLE public.nao_conformidades 
ADD COLUMN tipo_nc_id UUID REFERENCES public.tipos_nc(id);