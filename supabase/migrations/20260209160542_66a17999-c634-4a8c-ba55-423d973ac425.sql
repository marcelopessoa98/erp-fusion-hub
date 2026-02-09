
-- Tabela de configuração de contrato por obra (valores fixos + preços unitários)
CREATE TABLE public.contratos_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  contratante_nome TEXT NOT NULL DEFAULT '',
  contratante_cnpj TEXT NOT NULL DEFAULT '',
  contratado_nome TEXT NOT NULL DEFAULT 'Concre Fuji Tecnologia',
  contratado_cnpj TEXT NOT NULL DEFAULT '32.721.991/0001-98',
  servicos_descricao TEXT NOT NULL DEFAULT '',
  numero_proposta TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(obra_id)
);

-- Itens do contrato (tabela de preços unitários)
CREATE TABLE public.contrato_config_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_config_id UUID NOT NULL REFERENCES public.contratos_config(id) ON DELETE CASCADE,
  item_numero TEXT NOT NULL DEFAULT '1.0',
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'und',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Flag medido em horas_extras
ALTER TABLE public.horas_extras ADD COLUMN medido BOOLEAN NOT NULL DEFAULT false;

-- Flag medido em servicos_extras
ALTER TABLE public.servicos_extras ADD COLUMN medido BOOLEAN NOT NULL DEFAULT false;

-- RLS contratos_config
ALTER TABLE public.contratos_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contratos_config of their filiais"
  ON public.contratos_config FOR SELECT
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can manage contratos_config"
  ON public.contratos_config FOR ALL
  USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

-- RLS contrato_config_itens
ALTER TABLE public.contrato_config_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contrato_config_itens"
  ON public.contrato_config_itens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.contratos_config c
    WHERE c.id = contrato_config_itens.contrato_config_id
    AND (is_admin(auth.uid()) OR has_filial_access(auth.uid(), c.filial_id))
  ));

CREATE POLICY "Admins and gerentes can manage contrato_config_itens"
  ON public.contrato_config_itens FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.contratos_config c
    WHERE c.id = contrato_config_itens.contrato_config_id
    AND (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), c.filial_id)))
  ));

-- Trigger updated_at
CREATE TRIGGER update_contratos_config_updated_at
  BEFORE UPDATE ON public.contratos_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
