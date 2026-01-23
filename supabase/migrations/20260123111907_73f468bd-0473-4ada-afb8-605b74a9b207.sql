-- Tabela de avaliações positivas (elogios) para funcionários
CREATE TABLE public.avaliacoes_funcionarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avaliacoes_funcionarios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view avaliacoes of their filiais"
ON public.avaliacoes_funcionarios
FOR SELECT
USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create avaliacoes"
ON public.avaliacoes_funcionarios
FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update avaliacoes"
ON public.avaliacoes_funcionarios
FOR UPDATE
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete avaliacoes"
ON public.avaliacoes_funcionarios
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_avaliacoes_funcionarios_updated_at
BEFORE UPDATE ON public.avaliacoes_funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para histórico de ranking mensal (funcionário do mês)
CREATE TABLE public.ranking_funcionario_mes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    pontuacao NUMERIC NOT NULL DEFAULT 0,
    total_avaliacoes INTEGER NOT NULL DEFAULT 0,
    total_ncs INTEGER NOT NULL DEFAULT 0,
    posicao INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(funcionario_id, filial_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.ranking_funcionario_mes ENABLE ROW LEVEL SECURITY;

-- Policies para ranking
CREATE POLICY "Users can view ranking of their filiais"
ON public.ranking_funcionario_mes
FOR SELECT
USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can manage ranking"
ON public.ranking_funcionario_mes
FOR ALL
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

-- Adicionar política de DELETE para horas_extras (faltando no schema atual)
CREATE POLICY "Admins and gerentes can delete horas_extras"
ON public.horas_extras
FOR DELETE
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));