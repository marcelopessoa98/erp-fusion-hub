
CREATE TABLE public.recibos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_extra_id UUID REFERENCES public.servicos_extras(id) ON DELETE SET NULL,
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_extenso TEXT NOT NULL DEFAULT '',
  descricao_servico TEXT NOT NULL DEFAULT '',
  data_recibo DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recibos of their filiais"
  ON public.recibos FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create recibos"
  ON public.recibos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update recibos"
  ON public.recibos FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente') AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete recibos"
  ON public.recibos FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
