
-- =============================================
-- 1. DOCUMENTAÇÃO DE FUNCIONÁRIOS
-- =============================================
CREATE TABLE public.documentos_funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  tipo_documento TEXT NOT NULL, -- ASO, NR, CNH, Certificado, Contrato, Termo
  nome_documento TEXT NOT NULL,
  data_emissao DATE,
  data_validade DATE,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'vigente', -- vigente, vencido, a_vencer
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documentos of their filiais"
  ON public.documentos_funcionarios FOR SELECT
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create documentos"
  ON public.documentos_funcionarios FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update documentos"
  ON public.documentos_funcionarios FOR UPDATE
  USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete documentos"
  ON public.documentos_funcionarios FOR DELETE
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_documentos_funcionarios_updated_at
  BEFORE UPDATE ON public.documentos_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. MEDIÇÃO (Faturamento por obra)
-- =============================================
CREATE TABLE public.medicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  numero_medicao INTEGER NOT NULL DEFAULT 1,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, enviada, aprovada, rejeitada
  aprovado_por UUID,
  data_aprovacao TIMESTAMPTZ,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medicoes of their filiais"
  ON public.medicoes FOR SELECT
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create medicoes"
  ON public.medicoes FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins can update medicoes"
  ON public.medicoes FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete medicoes"
  ON public.medicoes FOR DELETE
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_medicoes_updated_at
  BEFORE UPDATE ON public.medicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens da medição
CREATE TABLE public.medicao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicao_id UUID NOT NULL REFERENCES public.medicoes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  checado BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medicao_itens"
  ON public.medicao_itens FOR SELECT
  USING (EXISTS (SELECT 1 FROM medicoes m WHERE m.id = medicao_itens.medicao_id AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), m.filial_id))));

CREATE POLICY "Users can manage medicao_itens"
  ON public.medicao_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM medicoes m WHERE m.id = medicao_itens.medicao_id AND is_admin(auth.uid())));

CREATE POLICY "Authenticated users can insert medicao_itens"
  ON public.medicao_itens FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM medicoes m WHERE m.id = medicao_itens.medicao_id AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), m.filial_id))));

-- =============================================
-- 3. SOLICITAÇÃO DE COMPRAS
-- =============================================
CREATE TABLE public.solicitacoes_compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  obra_id UUID REFERENCES public.obras(id),
  solicitante_nome TEXT NOT NULL,
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  urgencia TEXT NOT NULL DEFAULT 'normal', -- baixa, normal, alta, urgente
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovada, rejeitada, comprada
  aprovado_por UUID,
  data_aprovacao TIMESTAMPTZ,
  motivo_rejeicao TEXT,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view solicitacoes of their filiais"
  ON public.solicitacoes_compras FOR SELECT
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create solicitacoes"
  ON public.solicitacoes_compras FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update solicitacoes"
  ON public.solicitacoes_compras FOR UPDATE
  USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete solicitacoes"
  ON public.solicitacoes_compras FOR DELETE
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_solicitacoes_compras_updated_at
  BEFORE UPDATE ON public.solicitacoes_compras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens da solicitação de compra
CREATE TABLE public.solicitacao_compras_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_compras(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'un',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacao_compras_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view solicitacao_itens"
  ON public.solicitacao_compras_itens FOR SELECT
  USING (EXISTS (SELECT 1 FROM solicitacoes_compras s WHERE s.id = solicitacao_compras_itens.solicitacao_id AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), s.filial_id))));

CREATE POLICY "Users can insert solicitacao_itens"
  ON public.solicitacao_compras_itens FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM solicitacoes_compras s WHERE s.id = solicitacao_compras_itens.solicitacao_id AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), s.filial_id))));

CREATE POLICY "Admins and gerentes can manage solicitacao_itens"
  ON public.solicitacao_compras_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM solicitacoes_compras s WHERE s.id = solicitacao_compras_itens.solicitacao_id AND (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), s.filial_id)))));
