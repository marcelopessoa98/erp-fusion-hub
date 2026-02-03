-- Adicionar policy DELETE para admins na tabela nao_conformidades
CREATE POLICY "Admins can delete nao_conformidades" 
ON public.nao_conformidades 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Criar tabela de serviços extras
CREATE TABLE public.servicos_extras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    filial_id UUID NOT NULL REFERENCES public.filiais(id),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    obra_id UUID NOT NULL REFERENCES public.obras(id),
    material_recebido TEXT NOT NULL,
    descricao_servico TEXT NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pago', 'pendente')),
    status_servico TEXT NOT NULL DEFAULT 'pendente' CHECK (status_servico IN ('pendente', 'finalizado')),
    data_recebimento DATE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    usuario_nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.servicos_extras ENABLE ROW LEVEL SECURITY;

-- Policies for servicos_extras
CREATE POLICY "Users can view servicos_extras of their filiais" 
ON public.servicos_extras 
FOR SELECT 
USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create servicos_extras" 
ON public.servicos_extras 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update servicos_extras" 
ON public.servicos_extras 
FOR UPDATE 
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete servicos_extras" 
ON public.servicos_extras 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_servicos_extras_updated_at
BEFORE UPDATE ON public.servicos_extras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();