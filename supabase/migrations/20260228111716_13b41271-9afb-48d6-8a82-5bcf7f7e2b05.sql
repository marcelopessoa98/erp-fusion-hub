
-- Tabela equipe_tecnica
CREATE TABLE public.equipe_tecnica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  formacao TEXT,
  numero_crea TEXT,
  carimbo_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.equipe_tecnica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipe_tecnica"
  ON public.equipe_tecnica FOR SELECT
  USING (true);

CREATE POLICY "Admins and gerentes can manage equipe_tecnica"
  ON public.equipe_tecnica FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'gerente'::app_role));

-- Bucket para carimbos
INSERT INTO storage.buckets (id, name, public) VALUES ('carimbos', 'carimbos', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload carimbos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'carimbos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view carimbos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carimbos');

CREATE POLICY "Admins can delete carimbos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'carimbos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update carimbos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'carimbos' AND public.is_admin(auth.uid()));
