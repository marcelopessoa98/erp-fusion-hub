
-- Categorias financeiras (customizáveis)
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'despesa',
  descricao TEXT,
  cor TEXT DEFAULT '#6B7280',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins can manage categorias_financeiras" ON public.categorias_financeiras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

CREATE POLICY "CEO and admins can view categorias_financeiras" ON public.categorias_financeiras
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

-- Lançamentos financeiros (entradas e saídas)
CREATE TABLE public.lancamentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'despesa',
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  filial_id UUID REFERENCES public.filiais(id),
  cliente_id UUID REFERENCES public.clientes(id),
  obra_id UUID REFERENCES public.obras(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  comprovante_url TEXT,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO can manage lancamentos_financeiros" ON public.lancamentos_financeiros
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

CREATE POLICY "CEO can view lancamentos_financeiros" ON public.lancamentos_financeiros
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

-- Cobranças de clientes
CREATE TABLE public.cobrancas_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  obra_id UUID REFERENCES public.obras(id),
  filial_id UUID REFERENCES public.filiais(id),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cobrancas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO can manage cobrancas_clientes" ON public.cobrancas_clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

CREATE POLICY "CEO can view cobrancas_clientes" ON public.cobrancas_clientes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

-- Planejamento financeiro
CREATE TABLE public.planejamento_financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID REFERENCES public.categorias_financeiras(id),
  filial_id UUID REFERENCES public.filiais(id),
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  valor_planejado NUMERIC NOT NULL DEFAULT 0,
  valor_realizado NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, filial_id, mes, ano)
);

ALTER TABLE public.planejamento_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO can manage planejamento_financeiro" ON public.planejamento_financeiro
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

CREATE POLICY "CEO can view planejamento_financeiro" ON public.planejamento_financeiro
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()));

-- Insert default categories
INSERT INTO public.categorias_financeiras (nome, tipo, descricao, cor) VALUES
  ('Folha de Pagamento', 'despesa', 'Salários, encargos e benefícios', '#EF4444'),
  ('Materiais e Insumos', 'despesa', 'Compra de materiais para obras', '#F59E0B'),
  ('Custos Operacionais', 'despesa', 'Aluguel, energia, combustível, manutenção', '#8B5CF6'),
  ('Impostos e Taxas', 'despesa', 'Tributos e taxas governamentais', '#EC4899'),
  ('Serviços de Terceiros', 'despesa', 'Serviços contratados externamente', '#6366F1'),
  ('Receita de Serviços', 'receita', 'Receita de serviços prestados', '#10B981'),
  ('Receita de Contratos', 'receita', 'Receita de contratos com clientes', '#06B6D4'),
  ('Outras Receitas', 'receita', 'Receitas diversas', '#84CC16');
