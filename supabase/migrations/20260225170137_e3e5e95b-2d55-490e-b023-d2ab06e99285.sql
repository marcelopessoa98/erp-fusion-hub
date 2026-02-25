
-- Create ensaios table
CREATE TABLE public.ensaios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  tipo TEXT NOT NULL,
  data_ensaio DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_id UUID REFERENCES public.funcionarios(id),
  status TEXT NOT NULL DEFAULT 'pendente',
  resultado TEXT,
  campos_especificos JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ensaios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ensaios of their filiais"
  ON public.ensaios FOR SELECT
  USING (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Authenticated users can create ensaios"
  ON public.ensaios FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_filial_access(auth.uid(), filial_id));

CREATE POLICY "Admins and gerentes can update ensaios"
  ON public.ensaios FOR UPDATE
  USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'gerente'::app_role) AND has_filial_access(auth.uid(), filial_id)));

CREATE POLICY "Admins can delete ensaios"
  ON public.ensaios FOR DELETE
  USING (is_admin(auth.uid()));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ensaios-anexos', 'ensaios-anexos', false);

-- Storage RLS policies
CREATE POLICY "Users can upload ensaio attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ensaios-anexos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view ensaio attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ensaios-anexos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete ensaio attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ensaios-anexos' AND auth.role() = 'authenticated');
